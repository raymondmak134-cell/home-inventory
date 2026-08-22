type TopNavProps = {
  familyName?: string
  onAvatarClick?: () => void
}

export function TopNav({
  familyName = '我的家',
  onAvatarClick,
}: TopNavProps) {
  return (
    <header className="top-nav" role="banner">
      <div className="top-nav__family">
        <span className="top-nav__family-name">{familyName}</span>
        <button
          type="button"
          className="top-nav__family-toggle"
          aria-label="切换家庭"
        >
          <svg
            className="top-nav__chevron"
            viewBox="0 0 12 8"
            width="12"
            height="8"
            aria-hidden="true"
          >
            <path
              d="M1.2 1.4 6 6.2l4.8-4.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="top-nav__avatar"
        aria-label="个人主页"
        onClick={onAvatarClick}
      >
        <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
          <circle cx="20" cy="20" r="20" className="top-nav__avatar-disk" />
          <circle cx="20" cy="15" r="6" fill="#f7faf9" />
          <path
            d="M8.5 34.5c2.8-6.2 7-9.5 11.5-9.5s8.7 3.3 11.5 9.5"
            fill="#f7faf9"
          />
        </svg>
      </button>
    </header>
  )
}
