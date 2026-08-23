type MobileTopNavProps = {
  title: string
  onBack?: () => void
  backLabel?: string
}

export function MobileTopNav({
  title,
  onBack,
  backLabel = '返回',
}: MobileTopNavProps) {
  return (
    <header className="mobile-top-nav" role="banner">
      <div className="mobile-top-nav__side">
        {onBack ? (
          <button
            type="button"
            className="mobile-top-nav__back"
            aria-label={backLabel}
            onClick={onBack}
          >
            <BackIcon />
          </button>
        ) : (
          <span className="mobile-top-nav__spacer" aria-hidden="true" />
        )}
      </div>
      <h1 className="mobile-top-nav__title">{title}</h1>
      <div className="mobile-top-nav__side mobile-top-nav__side--end">
        <span className="mobile-top-nav__spacer" aria-hidden="true" />
      </div>
    </header>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
