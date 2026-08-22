import type { ReactNode } from 'react'

export type SlideLayer = 'active' | 'under' | 'offscreen'

type SlideStackProps = {
  active: boolean
  children: ReactNode
}

/** 覆盖在首页之上的全屏滑动层：进入时从右滑入，返回时向右滑出 */
export function SlideStack({ active, children }: SlideStackProps) {
  return (
    <div
      className={['slide-stack', active ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

type SlidePageProps = {
  layer: SlideLayer
  children: ReactNode
}

/** 栈内子页面：active 当前页，under 上一级留底，offscreen 在右侧等待进入 */
export function SlidePage({ layer, children }: SlidePageProps) {
  return (
    <div
      className={[
        'slide-page',
        layer === 'active' ? 'is-active' : '',
        layer === 'under' ? 'is-under' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={layer === 'offscreen'}
    >
      {children}
    </div>
  )
}

export function getSlideLayer(
  pageKey: 'profile' | 'account-settings' | 'family' | 'admin-users',
  currentKey: 'profile' | 'account-settings' | 'family' | 'admin-users',
): SlideLayer {
  if (pageKey === currentKey) return 'active'
  if (pageKey === 'profile' && currentKey !== 'profile') return 'under'
  return 'offscreen'
}
