import { useId, useState } from 'react'
import type { Family } from '../api/profile'
import {
  addFamilyMemberApi,
  createFamily,
  deleteFamilyApi,
  removeFamilyMemberApi,
} from '../api/profile'
import { AppPage } from '../components/AppPage'

type FamilyManagementPageProps = {
  families: Family[]
  onBack: () => void
  onChange: (families: Family[]) => void
}

export function FamilyManagementPage({
  families,
  onBack,
  onChange,
}: FamilyManagementPageProps) {
  const [newFamilyName, setNewFamilyName] = useState('')
  const [memberDrafts, setMemberDrafts] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const familyNameId = useId()

  async function handleAddFamily() {
    const name = newFamilyName.trim()
    if (!name || busy) return
    setBusy(true)
    setError('')
    const result = await createFamily(name)
    setBusy(false)
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    onChange([...families, { ...result.family, members: [] }])
    setNewFamilyName('')
  }

  async function handleDeleteFamily(familyId: number) {
    const family = families.find((item) => item.id === familyId)
    if (!family || busy) return
    const confirmed = window.confirm(`确定删除家庭「${family.name}」吗？`)
    if (!confirmed) return

    setBusy(true)
    setError('')
    const result = await deleteFamilyApi(familyId)
    setBusy(false)
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    onChange(families.filter((item) => item.id !== familyId))
  }

  async function handleAddMember(familyId: number) {
    const name = (memberDrafts[familyId] ?? '').trim()
    if (!name || busy) return

    setBusy(true)
    setError('')
    const result = await addFamilyMemberApi(familyId, name)
    setBusy(false)
    if ('error' in result) {
      setError(result.error.message)
      return
    }

    onChange(
      families.map((family) =>
        family.id === familyId
          ? { ...family, members: [...family.members, result.member] }
          : family,
      ),
    )
    setMemberDrafts((current) => ({ ...current, [familyId]: '' }))
  }

  async function handleRemoveMember(familyId: number, memberId: number) {
    if (busy) return
    setBusy(true)
    setError('')
    const result = await removeFamilyMemberApi(familyId, memberId)
    setBusy(false)
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    onChange(
      families.map((family) =>
        family.id === familyId
          ? {
              ...family,
              members: family.members.filter((member) => member.id !== memberId),
            }
          : family,
      ),
    )
  }

  return (
    <AppPage title="家庭管理" onBack={onBack}>
      <section className="app-section" aria-label="添加家庭">
        <h2 className="account-panel__title">添加家庭</h2>
        <div className="app-inline-row">
          <div className="field-block app-inline-row__grow">
            <label className="field" htmlFor={familyNameId}>
              <span className="sr-only">家庭名称</span>
              <input
                id={familyNameId}
                type="text"
                value={newFamilyName}
                placeholder="例如：我的家"
                disabled={busy}
                onChange={(event) => setNewFamilyName(event.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="ghost-btn app-inline-row__btn"
            disabled={busy}
            onClick={() => void handleAddFamily()}
          >
            添加
          </button>
        </div>
      </section>

      <section className="app-section" aria-label="家庭列表">
        <h2 className="account-panel__title">我的家庭</h2>

        {error ? (
          <p className="form-error is-visible" role="alert">
            {error}
          </p>
        ) : null}

        {families.length === 0 ? (
          <p className="boot-status app-empty">还没有家庭，先添加一个吧。</p>
        ) : (
          <ul className="family-list">
            {families.map((family) => (
              <li key={family.id} className="family-card">
                <div className="family-card__header">
                  <p className="admin-user__name">{family.name}</p>
                  <button
                    type="button"
                    className="admin-panel__refresh is-danger"
                    disabled={busy}
                    onClick={() => void handleDeleteFamily(family.id)}
                  >
                    删除
                  </button>
                </div>

                <div className="family-card__members">
                  <p className="account-panel__meta">家庭成员</p>
                  {family.members.length === 0 ? (
                    <p className="boot-status app-empty app-empty--compact">暂无成员</p>
                  ) : (
                    <ul className="family-member-list">
                      {family.members.map((member) => (
                        <li key={member.id} className="family-member">
                          <span>{member.name}</span>
                          <button
                            type="button"
                            className="admin-panel__refresh is-danger"
                            disabled={busy}
                            aria-label={`移除 ${member.name}`}
                            onClick={() => void handleRemoveMember(family.id, member.id)}
                          >
                            移除
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="app-inline-row app-inline-row--compact">
                    <div className="field-block app-inline-row__grow">
                      <label className="field">
                        <span className="sr-only">成员昵称</span>
                        <input
                          type="text"
                          value={memberDrafts[family.id] ?? ''}
                          placeholder="成员昵称"
                          disabled={busy}
                          aria-label={`为 ${family.name} 添加成员`}
                          onChange={(event) =>
                            setMemberDrafts((current) => ({
                              ...current,
                              [family.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn app-inline-row__btn"
                      disabled={busy}
                      onClick={() => void handleAddMember(family.id)}
                    >
                      添加成员
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppPage>
  )
}
