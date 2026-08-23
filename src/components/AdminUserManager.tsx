import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  deleteUserAccount,
  fetchUsers,
  updateUserAccount,
} from '../api/admin'
import type { PublicUser, UserRole } from '../api/auth'
import { validateRegisterPassword } from '../validation/password'

type Props = {
  currentUser: PublicUser
  onUserUpdated: (user: PublicUser) => void
}

type EditState = {
  id: number
  username: string
  password: string
  role: UserRole
}

export function AdminUserManager({ currentUser, onUserUpdated }: Props) {
  const [users, setUsers] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [editError, setEditError] = useState('')
  const usernameId = useId()
  const passwordId = useId()

  async function loadUsers(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true)
    setError('')
    const result = await fetchUsers()
    if ('error' in result) {
      setError(result.error.message)
      setUsers([])
    } else {
      setUsers(result.users)
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetchUsers()
      if (cancelled) return
      if ('error' in result) {
        setError(result.error.message)
        setUsers([])
      } else {
        setUsers(result.users)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function startEdit(user: PublicUser) {
    setEdit({
      id: user.id,
      username: user.username,
      password: '',
      role: user.role,
    })
    setEditError('')
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!edit || busyId !== null) return

    if (!edit.username.trim()) {
      setEditError('请输入账号')
      return
    }
    if (edit.password) {
      const passwordError = validateRegisterPassword(edit.password)
      if (passwordError) {
        setEditError(passwordError)
        return
      }
    }

    setBusyId(edit.id)
    setEditError('')
    const patch: { username?: string; password?: string; role?: UserRole } = {
      username: edit.username.trim(),
      role: edit.role,
    }
    if (edit.password) patch.password = edit.password

    const result = await updateUserAccount(edit.id, patch)
    setBusyId(null)
    if ('error' in result) {
      setEditError(result.error.message)
      return
    }

    setUsers((current) =>
      current.map((user) => (user.id === result.user.id ? result.user : user)),
    )
    if (result.user.id === currentUser.id) {
      onUserUpdated(result.user)
    }
    setEdit(null)
  }

  async function handleDelete(user: PublicUser) {
    if (busyId !== null) return
    if (user.id === currentUser.id) {
      setError('不能删除当前登录账号')
      return
    }
    const confirmed = window.confirm(`确定删除账号「${user.username}」吗？`)
    if (!confirmed) return

    setBusyId(user.id)
    setError('')
    const result = await deleteUserAccount(user.id)
    setBusyId(null)
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    setUsers((current) => current.filter((item) => item.id !== user.id))
    if (edit?.id === user.id) setEdit(null)
  }

  return (
    <section className="admin-panel" aria-label="账号管理">
      <div className="admin-panel__header">
        <h2 className="admin-panel__title">账号管理</h2>
        <button
          type="button"
          className="admin-panel__refresh"
          onClick={() => void loadUsers()}
          disabled={loading || busyId !== null}
        >
          刷新
        </button>
      </div>

      {loading ? (
        <p className="admin-panel__status" role="status">
          加载账号列表…
        </p>
      ) : null}

      {error ? (
        <p className="admin-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && users.length === 0 && !error ? (
        <p className="admin-panel__status">暂无账号</p>
      ) : null}

      <ul className="admin-user-list">
        {users.map((user) => {
          const isEditing = edit?.id === user.id
          return (
            <li key={user.id} className="admin-user">
              <div className="admin-user__main">
                <div className="admin-user__identity">
                  <p className="admin-user__name">{user.username}</p>
                  <p className="admin-user__meta">
                    <span className={user.role === 'admin' ? 'role-tag is-admin' : 'role-tag'}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                    <span>注册于 {formatCreatedAt(user.createdAt)}</span>
                  </p>
                </div>
                <div className="admin-user__actions">
                  <button
                    type="button"
                    onClick={() => startEdit(user)}
                    disabled={busyId !== null}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => void handleDelete(user)}
                    disabled={busyId !== null || user.id === currentUser.id}
                  >
                    删除
                  </button>
                </div>
              </div>

              {isEditing && edit ? (
                <form className="admin-edit" onSubmit={(event) => void handleSave(event)}>
                  <label className="field" htmlFor={usernameId}>
                    <span className="sr-only">账号</span>
                    <input
                      id={usernameId}
                      value={edit.username}
                      onChange={(event) =>
                        setEdit({ ...edit, username: event.target.value })
                      }
                      placeholder="账号"
                      autoComplete="username"
                    />
                  </label>
                  <label className="field" htmlFor={passwordId}>
                    <span className="sr-only">新密码</span>
                    <input
                      id={passwordId}
                      type="password"
                      value={edit.password}
                      maxLength={20}
                      onChange={(event) =>
                        setEdit({ ...edit, password: event.target.value })
                      }
                      placeholder="新密码（留空则不修改）"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="admin-edit__role">
                    <span>角色</span>
                    <select
                      value={edit.role}
                      onChange={(event) =>
                        setEdit({
                          ...edit,
                          role: event.target.value as UserRole,
                        })
                      }
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </label>
                  {editError ? (
                    <p className="admin-panel__error" role="alert">
                      {editError}
                    </p>
                  ) : null}
                  <div className="admin-edit__actions">
                    <button type="submit" className="submit-btn" disabled={busyId !== null}>
                      保存
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setEdit(null)}
                      disabled={busyId !== null}
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function formatCreatedAt(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
