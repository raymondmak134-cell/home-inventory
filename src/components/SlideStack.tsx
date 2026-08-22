import { useEffect, useState, type ReactNode } from 'react'

export type MenuKey = 'profile' | 'account-settings' | 'family' | 'admin-users'

type Phase = 'entering' | 'open' | 'closing'

type Entry = { key: MenuKey; phase: Phase }

/** 与 App.css 中 .slide-page 的 transform 过渡时长保持一致（含少量余量） */
const EXIT_DURATION_MS = 360

type SlideStackProps = {
  stack: readonly MenuKey[]
  renderPage: (key: MenuKey) => ReactNode
}

/**
 * 覆盖在首页之上的滑动页面栈。
 * 只挂载当前链路与正在退出动画中的页面：
 * - 进入下一级：新页挂载在右侧（translateX(100%)），下一帧滑入到 0
 * - 返回上一级：当前页滑出到右侧，动画结束后卸载
 */
export function SlideStack({ stack, renderPage }: SlideStackProps) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    stack.map((key) => ({ key, phase: 'open' as Phase })),
  )
  const stackSignature = stack.join('|')
  const [syncedSignature, setSyncedSignature] = useState(stackSignature)

  if (syncedSignature !== stackSignature) {
    setSyncedSignature(stackSignature)
    const target = new Set(stack)
    let next: Entry[] = entries.map((entry) => {
      if (!target.has(entry.key) && entry.phase !== 'closing') {
        return { ...entry, phase: 'closing' as Phase }
      }
      if (target.has(entry.key) && entry.phase === 'closing') {
        return { ...entry, phase: 'open' as Phase }
      }
      return entry
    })
    const mounted = new Set(next.map((entry) => entry.key))
    for (const key of stack) {
      if (!mounted.has(key)) {
        next = [...next, { key, phase: 'entering' as Phase }]
      }
    }
    setEntries(next)
  }

  const hasEntering = entries.some((entry) => entry.phase === 'entering')
  useEffect(() => {
    if (!hasEntering) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setEntries((current) =>
          current.map((entry) =>
            entry.phase === 'entering' ? { ...entry, phase: 'open' as Phase } : entry,
          ),
        )
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [hasEntering])

  const hasClosing = entries.some((entry) => entry.phase === 'closing')
  useEffect(() => {
    if (!hasClosing) return
    const timer = window.setTimeout(() => {
      setEntries((current) => current.filter((entry) => entry.phase !== 'closing'))
    }, EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [entries, hasClosing])

  let activeIndex = -1
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index].phase !== 'closing') {
      activeIndex = index
      break
    }
  }

  return (
    <>
      {entries.map((entry, index) => (
        <div
          key={entry.key}
          className={[
            'slide-page',
            entry.phase === 'open' ? 'is-open' : '',
            entry.phase === 'closing' ? 'is-closing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          inert={index !== activeIndex || undefined}
        >
          {renderPage(entry.key)}
        </div>
      ))}
    </>
  )
}
