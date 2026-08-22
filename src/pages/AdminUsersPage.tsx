import type { PublicUser } from '../api/auth'
import { AdminUserManager } from '../components/AdminUserManager'
import { MobileTopNav } from '../components/MobileTopNav'

type AdminUsersPageProps = {
  user: PublicUser
  onBack: () => void
  onUserUpdated: (user: PublicUser) => void
}

export function AdminUsersPage({ user, onBack, onUserUpdated }: AdminUsersPageProps) {
  return (
    <div className="profile-shell profile-shell--wide">
      <MobileTopNav title="账号管理" onBack={onBack} />

      <main className="profile-shell__main profile-shell__main--admin">
        <AdminUserManager currentUser={user} onUserUpdated={onUserUpdated} />
      </main>
    </div>
  )
}
