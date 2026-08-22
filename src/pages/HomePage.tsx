import { EmptyWarehouse } from '../components/EmptyWarehouse'
import { TopNav } from '../components/TopNav'

type HomePageProps = {
  onOpenAccount?: () => void
}

export function HomePage({ onOpenAccount }: HomePageProps) {
  return (
    <div className="home-page">
      <TopNav familyName="我的家" onAvatarClick={onOpenAccount} />
      <main className="home-page__main">
        <EmptyWarehouse />
      </main>
    </div>
  )
}
