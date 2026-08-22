import type { PublicUser } from '../api/auth'
import { AdminUserManager } from '../components/AdminUserManager'

type AccountManagementPageProps = {
  user: PublicUser
  submitting?: boolean
  onLogout: () => void
  onUserUpdated: (user: PublicUser) => void
  onBackHome: () => void
}

/** 管理员/登录后的账号管理页（由原登录后页面迁移） */
export function AccountManagementPage({
  user,
  submitting = false,
  onLogout,
  onUserUpdated,
  onBackHome,
}: AccountManagementPageProps) {
  return (
    <div className="login-page">
      <main className={user.role === 'admin' ? 'login-shell is-wide' : 'login-shell'}>
        <header className="brand">
          <img className="brand-logo" src="/logo.svg" width={78} height={70} alt="" />
          <h1 className="brand-name">家仓</h1>
          <p className="brand-tagline">不必盲目加仓，好物存进家仓</p>
        </header>

        <section className="account-panel" aria-label="账号信息">
          <div className="account-panel__toolbar">
            <button type="button" className="text-link-btn" onClick={onBackHome}>
              返回首页
            </button>
          </div>
          <h2 className="account-panel__title">当前账号</h2>
          <p className="account-panel__name">{user.username}</p>
          <p className="account-panel__meta">
            {user.role === 'admin' ? '管理员 · ' : ''}
            注册于 {formatCreatedAt(user.createdAt)}
          </p>
          <button
            type="button"
            className="submit-btn"
            onClick={onLogout}
            disabled={submitting}
          >
            退出登录
          </button>
        </section>

        {user.role === 'admin' ? (
          <AdminUserManager currentUser={user} onUserUpdated={onUserUpdated} />
        ) : null}
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
