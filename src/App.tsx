import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthMode = 'login' | 'register'

export default function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const usernameId = useId()
  const passwordId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Auth wiring comes later; keep native submit/keyboard behavior for now.
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    if (next === 'register') {
      setUsername('')
      setPassword('')
      setShowPassword(false)
    }
  }

  const isLogin = mode === 'login'
  const passwordInputType = showPassword ? 'text' : 'password'

  return (
    <div className="login-page">
      <main className="login-shell">
        <header className="brand">
          <img className="brand-logo" src="/logo.svg" width={86} height={60} alt="" />
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

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field" htmlFor={usernameId}>
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
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="field" htmlFor={passwordId}>
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
              enterKeyHint="done"
              placeholder="请输入密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
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

          <button type="submit" className="submit-btn">
            {isLogin ? '登录' : '注册'}
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
