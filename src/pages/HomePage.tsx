import { useState } from 'react'
import { EmptyWarehouse } from '../components/EmptyWarehouse'
import { ScanSheet } from '../components/ScanSheet'
import { TopNav } from '../components/TopNav'

type HomePageProps = {
  onOpenAccount?: () => void
}

export function HomePage({ onOpenAccount }: HomePageProps) {
  const [scanOpen, setScanOpen] = useState(false)

  return (
    <div className="login-page app-page">
      <TopNav familyName="我的家" onAvatarClick={onOpenAccount} />
      <main className="login-shell app-page__main">
        <EmptyWarehouse onAddFirstItem={() => setScanOpen(true)} />
      </main>

      <ScanSheet open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  )
}
