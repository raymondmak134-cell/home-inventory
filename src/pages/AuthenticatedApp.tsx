import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { PublicUser } from '../api/auth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SlideStack, type MenuKey } from '../components/SlideStack'
import { ProfileProvider, useProfileContext } from '../context/ProfileContext'
import { appRoutes } from '../routes'
import { AccountSettingsPage } from './AccountSettingsPage'
import { AdminUsersPage } from './AdminUsersPage'
import { FamilyManagementPage } from './FamilyManagementPage'
import { HomePage } from './HomePage'
import { ProfilePage } from './ProfilePage'

type AuthenticatedAppProps = {
  user: PublicUser
  submitting?: boolean
  onLogout: () => void
  onUserUpdated: (user: PublicUser) => void
}

function AuthenticatedRoutes({
  user,
  submitting = false,
  onLogout,
  onUserUpdated,
}: AuthenticatedAppProps) {
  const location = useLocation()
  const {
    profile,
    families,
    loading,
    error,
    setFamilies,
    openProfile,
    openSubPage,
    goBack,
    profileOpen,
    currentMenuKey,
  } = useProfileContext()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const allowedPaths = new Set<string>([
    appRoutes.home,
    appRoutes.profile,
    appRoutes.profileSettings,
    appRoutes.profileFamilies,
  ])
  if (user.role === 'admin') {
    allowedPaths.add(appRoutes.profileAdminUsers)
  }

  if (!allowedPaths.has(location.pathname)) {
    return <Navigate to={appRoutes.home} replace />
  }

  function handleLogoutConfirm() {
    setLogoutOpen(false)
    onLogout()
  }

  const stack: readonly MenuKey[] = !profileOpen
    ? []
    : currentMenuKey === 'profile'
      ? ['profile']
      : ['profile', currentMenuKey]

  function renderStackPage(key: MenuKey) {
    switch (key) {
      case 'profile':
        return (
          <ProfilePage
            user={user}
            profile={profile}
            loading={loading}
            error={error}
            onNavigate={openSubPage}
            onBack={goBack}
            onLogoutRequest={() => setLogoutOpen(true)}
          />
        )
      case 'account-settings':
        return <AccountSettingsPage onBack={goBack} />
      case 'family':
        return (
          <FamilyManagementPage families={families} onBack={goBack} onChange={setFamilies} />
        )
      case 'admin-users':
        return <AdminUsersPage user={user} onBack={goBack} onUserUpdated={onUserUpdated} />
    }
  }

  return (
    <div className="authenticated-app">
      <div inert={profileOpen || undefined}>
        <HomePage onOpenAccount={openProfile} />
      </div>

      <SlideStack stack={stack} renderPage={renderStackPage} />

      <ConfirmDialog
        open={logoutOpen}
        title="退出登录"
        message="确定要退出当前账号吗？"
        confirmLabel="退出"
        confirming={submitting}
        onConfirm={handleLogoutConfirm}
        onCancel={() => {
          if (!submitting) setLogoutOpen(false)
        }}
      />
    </div>
  )
}

export function AuthenticatedApp(props: AuthenticatedAppProps) {
  return (
    <ProfileProvider>
      <AuthenticatedRoutes {...props} />
    </ProfileProvider>
  )
}
