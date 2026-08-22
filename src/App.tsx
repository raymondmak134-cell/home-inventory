import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  type PublicUser,
} from './api/auth'
import './App.css'

type AuthMode = 'login' | 'register'

type FieldErrors = {
  username?: string
  password?: string
  confirmPassword?: string
  form?: string
}

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const usernameId = useId()
  const passwordId = useId()
  const confirmPasswordId = useId()
  const usernameErrorId = useId()
  const passwordErrorId = useId()
  const confirmPasswordErrorId = useId()
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
    if (!password.trim()) next.password = '请输入密码'
    if (currentMode === 'register') {
      if (!confirmPassword.trim()) {
        next.confirmPassword = '请确认密码'
      } else if (confirmPassword !== password) {
        next.confirmPassword = '两次输入的密码不一致'
      }
    }
    return next
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
    setShowPassword(false)
    setShowConfirmPassword(false)
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
      <div className="login-page">
        <main className="login-shell">
          <header className="brand">
            <img className="brand-logo" src="/logo.svg" width={78} height={70} alt="" />
            <h1 className="brand-name">家仓</h1>
            <p className="brand-tagline">不必盲目加仓，好物存进家仓</p>
          </header>

          <section className="account-panel" aria-label="账号信息">
            <h2 className="account-panel__title">账号已登录</h2>
            <p className="account-panel__name">{user.username}</p>
            <p className="account-panel__meta">
              注册于 {formatCreatedAt(user.createdAt)}
            </p>
            <button
              type="button"
              className="submit-btn"
              onClick={() => void handleLogout()}
              disabled={submitting}
            >
              退出登录
            </button>
          </section>
        </main>
      </div>
    )
  }

  const isLogin = mode === 'login'
  const passwordInputType = showPassword ? 'text' : 'password'
  const confirmPasswordInputType = showConfirmPassword ? 'text' : 'password'
  const usernameInvalid = Boolean(errors.username)
  const passwordInvalid = Boolean(errors.password)
  const confirmPasswordInvalid = Boolean(errors.confirmPassword)
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
          <div className="field-block">
            <label
              className={usernameInvalid ? 'field is-error' : 'field'}
              htmlFor={usernameId}
            >
              <span className="sr-only">账号</span>
              <span className="field__icon" aria-hidden="true">
                <UserIcon />
              </span>
              <input
                id={usernameId}
                name="username"
                type="text"
                inputMode="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="请输入账号"
                value={username}
                aria-invalid={usernameInvalid}
                aria-describedby={usernameErrorId}
                onChange={(event) => {
                  setUsername(event.target.value)
                  if (errors.username || errors.form) {
                    setErrors((current) => ({
                      ...current,
                      username: undefined,
                      form: undefined,
                    }))
                  }
                }}
              />
            </label>
            <p
              id={usernameErrorId}
              className={usernameInvalid ? 'field-error is-visible' : 'field-error'}
              role={usernameInvalid ? 'alert' : undefined}
            >
              {errors.username ?? ''}
            </p>
          </div>

          <div className="field-block">
            <label
              className={passwordInvalid ? 'field is-error' : 'field'}
              htmlFor={passwordId}
            >
              <span className="sr-only">密码</span>
              <span className="field__icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                id={passwordId}
                name="password"
                type={passwordInputType}
                inputMode="text"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint={isLogin ? 'done' : 'next'}
                placeholder="请输入密码"
                value={password}
                aria-invalid={passwordInvalid}
                aria-describedby={passwordErrorId}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (errors.password || errors.confirmPassword || errors.form) {
                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                      form: undefined,
                      confirmPassword:
                        current.confirmPassword === '两次输入的密码不一致'
                          ? undefined
                          : current.confirmPassword,
                    }))
                  }
                }}
              />
              <button
                type="button"
                className="field__action"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </label>
            <p
              id={passwordErrorId}
              className={passwordInvalid ? 'field-error is-visible' : 'field-error'}
              role={passwordInvalid ? 'alert' : undefined}
            >
              {errors.password ?? ''}
            </p>
          </div>

          {!isLogin ? (
            <div className="field-block">
              <label
                className={confirmPasswordInvalid ? 'field is-error' : 'field'}
                htmlFor={confirmPasswordId}
              >
                <span className="sr-only">确认密码</span>
                <span className="field__icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={confirmPasswordInputType}
                  inputMode="text"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  placeholder="请再次确认密码"
                  value={confirmPassword}
                  aria-invalid={confirmPasswordInvalid}
                  aria-describedby={confirmPasswordErrorId}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    if (errors.confirmPassword) {
                      setErrors((current) => ({
                        ...current,
                        confirmPassword: undefined,
                      }))
                    }
                  }}
                />
                <button
                  type="button"
                  className="field__action"
                  aria-label={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </label>
              <p
                id={confirmPasswordErrorId}
                className={
                  confirmPasswordInvalid ? 'field-error is-visible' : 'field-error'
                }
                role={confirmPasswordInvalid ? 'alert' : undefined}
              >
                {errors.confirmPassword ?? ''}
              </p>
            </div>
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 18.5c1.6-3 3.8-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect
        x="6"
        y="10"
        width="12"
        height="10"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
