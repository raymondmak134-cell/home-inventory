import type { PublicUser } from '../api/auth'
import type { UserProfile } from '../api/profile'
import { AppPage } from '../components/AppPage'

type ProfileMenuItem = {
  key: 'account-settings' | 'family' | 'admin-users'
  label: string
  description: string
  adminOnly?: boolean
}

const MENU_ITEMS: ProfileMenuItem[] = [
  {
    key: 'account-settings',
    label: '账号设置',
    description: '头像、昵称与密码',
  },
  {
    key: 'family',
    label: '家庭管理',
    description: '添加家庭与成员',
  },
  {
    key: 'admin-users',
    label: '账号管理',
    description: '管理员用户管理',
    adminOnly: true,
  },
]

type ProfilePageProps = {
  user: PublicUser
  profile: UserProfile
  loading?: boolean
  error?: string
  onNavigate: (route: ProfileMenuItem['key']) => void
  onBack: () => void
  onLogoutRequest: () => void
}

export function ProfilePage({
  user,
  profile,
  loading = false,
  error = '',
  onNavigate,
  onBack,
  onLogoutRequest,
}: ProfilePageProps) {
  const displayName = profile.nickname.trim() || user.username

  return (
    <AppPage title="个人主页" onBack={onBack} backLabel="返回首页">
      <section className="account-panel profile-panel" aria-label="个人信息">
        <div className="profile-panel__avatar" aria-hidden="true">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="profile-panel__avatar-img" />
          ) : (
            <DefaultAvatar />
          )}
        </div>
        <p className="account-panel__name">{displayName}</p>
        <p className="account-panel__meta">
          {user.role === 'admin' ? '管理员' : '普通用户'}
        </p>
        {loading ? (
          <p className="boot-status" role="status">
            正在加载资料…
          </p>
        ) : null}
        {error ? (
          <p className="form-error is-visible" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <nav className="app-menu" aria-label="个人主页功能">
        <ul className="app-menu__list">
          {MENU_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin').map(
            (item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="app-menu__item"
                  onClick={() => onNavigate(item.key)}
                >
                  <span className="app-menu__item-text">
                    <span className="app-menu__item-label">{item.label}</span>
                    <span className="app-menu__item-desc">{item.description}</span>
                  </span>
                  <ChevronIcon />
                </button>
              </li>
            ),
          )}
        </ul>
      </nav>

      <div className="app-page__footer">
        <button type="button" className="ghost-btn app-logout-btn" onClick={onLogoutRequest}>
          退出登录
        </button>
      </div>
    </AppPage>
  )
}

function DefaultAvatar() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
      <circle cx="36" cy="36" r="36" fill="#f3f4f6" />
      <circle cx="36" cy="27" r="11" fill="#ffffff" />
      <path d="M14 62c4.8-10.5 12-16 22-16s17.2 5.5 22 16" fill="#ffffff" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M6 4.5 9.5 8 6 11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
