import type { ReactNode } from 'react'

export type MenuListItem = {
  key: string
  label: string
  description?: string
  trailing?: ReactNode
  onClick?: () => void
}

type MenuListProps = {
  items: MenuListItem[]
  ariaLabel?: string
}

/**
 * 通用列表入口控件：左侧标题 + 说明，右侧箭头（或自定义 trailing）。
 * 供个人主页等页面统一调用，样式见 App.css 中 .menu-list。
 */
export function MenuList({ items, ariaLabel }: MenuListProps) {
  return (
    <nav className="menu-list" aria-label={ariaLabel}>
      <ul className="menu-list__list">
        {items.map((item) => (
          <li key={item.key}>
            <button type="button" className="menu-list__item" onClick={item.onClick}>
              <span className="menu-list__item-text">
                <span className="menu-list__item-label">{item.label}</span>
                {item.description ? (
                  <span className="menu-list__item-desc">{item.description}</span>
                ) : null}
              </span>
              {item.trailing ?? <ChevronIcon />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="menu-list__item-arrow"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
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
