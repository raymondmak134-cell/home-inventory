import type { PublicUser } from '../api/auth'
import { MobileTopNav } from '../components/MobileTopNav'

export type ProfileSubRoute = 'account-settings' | 'family' | 'admin-users'
export type ProfileRoute = 'profile' | ProfileSubRoute
export type AppRoute = 'home' | ProfileRoute

type ProfileMenuItem = {
  key: ProfileSubRoute
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
  nickname: string
  avatarUrl: string | null
  onNavigate: (route: ProfileSubRoute) => void
  onBack: () => void
  onLogoutRequest: () => void
}

export function ProfilePage({
  user,
  nickname,
  avatarUrl,
  onNavigate,
  onBack,
  onLogoutRequest,
}: ProfilePageProps) {
  const displayName = nickname.trim() || user.username

  return (
    <div className="profile-shell">
      <MobileTopNav title="个人主页" onBack={onBack} backLabel="返回首页" />

      <main className="profile-shell__main">
        <section className="profile-header" aria-label="个人信息">
          <div className="profile-header__avatar" aria-hidden="true">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="profile-header__avatar-img" />
            ) : (
              <DefaultAvatar />
            )}
          </div>
          <p className="profile-header__name">{displayName}</p>
          <p className="profile-header__meta">
            {user.role === 'admin' ? '管理员' : '普通用户'}
          </p>
        </section>

        <nav className="profile-menu" aria-label="个人主页功能">
          <ul className="profile-menu__list">
            {MENU_ITEMS.filter(
              (item) => !item.adminOnly || user.role === 'admin',
            ).map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="profile-menu__item"
                  onClick={() => onNavigate(item.key)}
                >
                  <span className="profile-menu__item-text">
                    <span className="profile-menu__item-label">{item.label}</span>
                    <span className="profile-menu__item-desc">{item.description}</span>
                  </span>
                  <ChevronIcon />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="profile-shell__footer">
          <button
            type="button"
            className="profile-logout-btn"
            onClick={onLogoutRequest}
          >
            退出登录
          </button>
        </div>
      </main>
    </div>
  )
}

function DefaultAvatar() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
      <circle cx="36" cy="36" r="36" fill="#d7e8e1" />
      <circle cx="36" cy="27" r="11" fill="#f7faf9" />
      <path
        d="M14 62c4.8-10.5 12-16 22-16s17.2 5.5 22 16"
        fill="#f7faf9"
      />
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
