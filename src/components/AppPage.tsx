import type { ReactNode } from 'react'
import { MobileTopNav } from './MobileTopNav'

type AppPageProps = {
  title: string
  backLabel?: string
  onBack?: () => void
  wide?: boolean
  children: ReactNode
}

/** 登录后所有页面的统一白底壳层，复用登录页 layout 与 typography 体系 */
export function AppPage({
  title,
  backLabel,
  onBack,
  wide = false,
  children,
}: AppPageProps) {
  return (
    <div className="login-page app-page">
      <MobileTopNav title={title} onBack={onBack} backLabel={backLabel} />
      <main className={wide ? 'login-shell is-wide app-page__main' : 'login-shell app-page__main'}>
        {children}
      </main>
    </div>
  )
}
