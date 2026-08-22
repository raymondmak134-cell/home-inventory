import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import {
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  type PublicUser,
} from './api/auth'
import { LockIcon, UserIcon } from './components/fieldIcons'
import { TextField } from './components/TextField'
import { AuthenticatedApp } from './pages/AuthenticatedApp'
import {
  validateRegisterPassword,
} from './validation/password'
import './App.css'

type AuthMode = 'login' | 'register'
type FieldErrors = {
  username?: string
  password?: string
  confirmPassword?: string
  form?: string
}

export default function App() {
  const navigate = useNavigate()
  const [bootstrapping, setBootstrapping] = useState(true)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const formErrorId = useId()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const current = await fetchCurrentUser()
        if (!cancelled) setUser(current)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function validate(currentMode: AuthMode): FieldErrors {
    const next: FieldErrors = {}
    if (!username.trim()) next.username = '请输入账号'
    if (currentMode === 'register') {
      const passwordError = validateRegisterPassword(password)
      if (passwordError) next.password = passwordError
      if (!confirmPassword.trim()) {
        next.confirmPassword = '请确认密码'
      } else if (confirmPassword !== password) {
        next.confirmPassword = '两次输入的密码不一致'
      }
    } else if (!password.trim()) {
      next.password = '请输入密码'
    }
    return next
  }

  function syncRegisterPasswordErrors(
    nextPassword: string,
    nextConfirmPassword: string,
  ) {
    setErrors((current) => {
      const passwordError = validateRegisterPassword(nextPassword, {
        allowEmpty: true,
      })
      let confirmPasswordError: string | undefined
      if (!nextConfirmPassword) {
        confirmPasswordError =
          current.confirmPassword === '请确认密码'
            ? current.confirmPassword
            : undefined
      } else if (nextConfirmPassword !== nextPassword) {
        confirmPasswordError = '两次输入的密码不一致'
      }

      return {
        ...current,
        password: passwordError ?? undefined,
        confirmPassword: confirmPasswordError,
        form: undefined,
      }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validate(mode)
    setErrors(next)
    if (Object.keys(next).length > 0 || submitting) return

    setSubmitting(true)
    try {
      const result =
        mode === 'login'
          ? await loginAccount(username.trim(), password)
          : await registerAccount(username.trim(), password)

      if ('error' in result) {
        const field = result.error.field
        if (field) {
          setErrors({ [field]: result.error.message })
        } else {
          setErrors({ form: result.error.message })
        }
        return
      }

      setUser(result.user)
      setPassword('')
      setConfirmPassword('')
      setErrors({})
    } catch {
      setErrors({ form: '网络异常，请稍后重试' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setSubmitting(true)
    try {
      await logoutAccount()
    } finally {
      setUser(null)
      setMode('login')
      navigate('/')
      setUsername('admin')
      setPassword('')
      setConfirmPassword('')
      setErrors({})
      setSubmitting(false)
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    setErrors({})
    setConfirmPassword('')
    if (next === 'register') {
      setUsername('')
      setPassword('')
    }
  }

  if (bootstrapping) {
    return (
      <div className="login-page">
        <main className="login-shell">
          <p className="boot-status" role="status">
            正在加载…
          </p>
        </main>
      </div>
    )
  }

  if (user) {
    return (
      <AuthenticatedApp
        user={user}
        submitting={submitting}
        onLogout={() => void handleLogout()}
        onUserUpdated={setUser}
      />
    )
  }

  const isLogin = mode === 'login'
  const formInvalid = Boolean(errors.form)

  return (
    <div className="login-page">
      <main className="login-shell">
        <header className="brand">
          <img className="brand-logo" src="/logo.svg" width={78} height={70} alt="" />
          <h1 className="brand-name">家仓</h1>
          <p className="brand-tagline">不必盲目加仓，好物存进家仓</p>
        </header>

        <div
          className="mode-switch"
          role="tablist"
          aria-label="登录或注册"
        >
          <span
            className={
              isLogin
                ? 'mode-switch__thumb is-login'
                : 'mode-switch__thumb is-register'
            }
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={isLogin ? 'mode-switch__item is-active' : 'mode-switch__item'}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={!isLogin ? 'mode-switch__item is-active' : 'mode-switch__item'}
            onClick={() => switchMode('register')}
          >
            注册账号
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
          aria-describedby={formInvalid ? formErrorId : undefined}
        >
          <TextField
            label="账号"
            name="username"
            inputMode="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="请输入账号"
            icon={<UserIcon />}
            value={username}
            error={errors.username}
            onValueChange={(next) => {
              setUsername(next)
              if (errors.username || errors.form) {
                setErrors((current) => ({
                  ...current,
                  username: undefined,
                  form: undefined,
                }))
              }
            }}
          />

          <TextField
            label="密码"
            name="password"
            type="password"
            allowReveal
            inputMode="text"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={isLogin ? 'done' : 'next'}
            placeholder="请输入密码"
            icon={<LockIcon />}
            maxLength={isLogin ? undefined : 20}
            value={password}
            error={errors.password}
            onValueChange={(nextPassword) => {
              setPassword(nextPassword)
              if (mode === 'register') {
                syncRegisterPasswordErrors(nextPassword, confirmPassword)
                return
              }
              if (errors.password || errors.form) {
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                  form: undefined,
                }))
              }
            }}
          />

          {!isLogin ? (
            <TextField
              label="确认密码"
              name="confirmPassword"
              type="password"
              allowReveal
              inputMode="text"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="请再次确认密码"
              icon={<LockIcon />}
              maxLength={20}
              value={confirmPassword}
              error={errors.confirmPassword}
              onValueChange={(nextConfirmPassword) => {
                setConfirmPassword(nextConfirmPassword)
                syncRegisterPasswordErrors(password, nextConfirmPassword)
              }}
            />
          ) : null}

          <p
            id={formErrorId}
            className={formInvalid ? 'form-error is-visible' : 'form-error'}
            role={formInvalid ? 'alert' : undefined}
          >
            {errors.form ?? ''}
          </p>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? (isLogin ? '登录中…' : '注册中…') : isLogin ? '登录' : '注册'}
          </button>
        </form>

        {isLogin ? (
          <p className="footer-link">
            <button type="button" onClick={() => switchMode('register')}>
              没有账号？去注册一个
            </button>
          </p>
        ) : (
          <p className="footer-link">
            <button type="button" onClick={() => switchMode('login')}>
              已有账号？去登录
            </button>
          </p>
        )}
      </main>
    </div>
  )
}