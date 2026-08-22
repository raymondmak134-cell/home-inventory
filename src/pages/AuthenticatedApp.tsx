import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { PublicUser } from '../api/auth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SlidePage, SlideStack } from '../components/SlideStack'
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
    setProfile,
    setFamilies,
    openProfile,
    openSubPage,
    goBack,
    profileOpen,
    currentMenuKey,
    direction,
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

  if (user.role !== 'admin' && location.pathname === appRoutes.profileAdminUsers) {
    return <Navigate to={appRoutes.profile} replace />
  }

  function handleLogoutConfirm() {
    setLogoutOpen(false)
    onLogout()
  }

  return (
    <div className="authenticated-app">
      <Routes>
        <Route path={appRoutes.home} element={<HomePage onOpenAccount={openProfile} />} />
      </Routes>

      <SlideStack active={profileOpen} direction={direction}>
        {profileOpen ? (
          <>
            <SlidePage visible={currentMenuKey === 'profile'} direction={direction}>
              <ProfilePage
                user={user}
                profile={profile}
                loading={loading}
                error={error}
                onNavigate={openSubPage}
                onBack={goBack}
                onLogoutRequest={() => setLogoutOpen(true)}
              />
            </SlidePage>

            <SlidePage
              visible={currentMenuKey === 'account-settings'}
              direction={direction}
            >
              <AccountSettingsPage
                key={`${profile.nickname}:${profile.avatarUrl ?? ''}`}
                profile={profile}
                onBack={goBack}
                onSaved={setProfile}
              />
            </SlidePage>

            <SlidePage visible={currentMenuKey === 'family'} direction={direction}>
              <FamilyManagementPage
                families={families}
                onBack={goBack}
                onChange={setFamilies}
              />
            </SlidePage>

            {user.role === 'admin' ? (
              <SlidePage visible={currentMenuKey === 'admin-users'} direction={direction}>
                <AdminUsersPage user={user} onBack={goBack} onUserUpdated={onUserUpdated} />
              </SlidePage>
            ) : null}
          </>
        ) : null}
      </SlideStack>

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
