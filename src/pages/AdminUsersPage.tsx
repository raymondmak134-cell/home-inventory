import type { PublicUser } from '../api/auth'
import { AdminUserManager } from '../components/AdminUserManager'
import { AppPage } from '../components/AppPage'

type AdminUsersPageProps = {
  user: PublicUser
  onBack: () => void
  onUserUpdated: (user: PublicUser) => void
}

export function AdminUsersPage({ user, onBack, onUserUpdated }: AdminUsersPageProps) {
  return (
    <AppPage title="账号管理" onBack={onBack} wide>
      <AdminUserManager currentUser={user} onUserUpdated={onUserUpdated} />
    </AppPage>
  )
}
