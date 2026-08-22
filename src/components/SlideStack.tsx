import type { ReactNode } from 'react'

export type NavDirection = 'forward' | 'back'

type SlideStackProps = {
  active: boolean
  direction: NavDirection
  children: ReactNode
}

/** 覆盖在首页之上的全屏滑动层 */
export function SlideStack({ active, direction, children }: SlideStackProps) {
  return (
    <div
      className={[
        'slide-stack',
        active ? 'is-active' : '',
        direction === 'forward' ? 'is-forward' : 'is-back',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

type SlidePageProps = {
  visible: boolean
  direction: NavDirection
  children: ReactNode
}

/** 栈内子页面的滑动切换 */
export function SlidePage({ visible, direction, children }: SlidePageProps) {
  return (
    <div
      className={[
        'slide-page',
        visible ? 'is-visible' : '',
        direction === 'forward' ? 'is-forward' : 'is-back',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!visible}
    >
      {children}
    </div>
  )
}
