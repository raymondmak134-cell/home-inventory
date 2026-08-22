import { useState } from 'react'
import type { PublicUser } from '../api/auth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SlidePage, SlideStack, type NavDirection } from '../components/SlideStack'
import { AccountSettingsPage } from './AccountSettingsPage'
import { AdminUsersPage } from './AdminUsersPage'
import {
  FamilyManagementPage,
  type Family,
} from './FamilyManagementPage'
import { HomePage } from './HomePage'
import { ProfilePage, type AppRoute, type ProfileSubRoute } from './ProfilePage'

type AuthenticatedAppProps = {
  user: PublicUser
  submitting?: boolean
  onLogout: () => void
  onUserUpdated: (user: PublicUser) => void
}

const DEFAULT_FAMILIES: Family[] = []

export function AuthenticatedApp({
  user,
  submitting = false,
  onLogout,
  onUserUpdated,
}: AuthenticatedAppProps) {
  const [route, setRoute] = useState<AppRoute>('home')
  const [direction, setDirection] = useState<NavDirection>('forward')
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [families, setFamilies] = useState<Family[]>(DEFAULT_FAMILIES)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const profileOpen = route !== 'home'

  function openProfile() {
    setDirection('forward')
    setRoute('profile')
  }

  function openSubPage(next: ProfileSubRoute) {
    setDirection('forward')
    setRoute(next)
  }

  function goBack() {
    setDirection('back')
    if (route === 'profile') {
      setRoute('home')
      return
    }
    setRoute('profile')
  }

  function handleSaveProfile(patch: { nickname?: string; avatarUrl?: string | null }) {
    if (patch.nickname !== undefined) setNickname(patch.nickname)
    if (patch.avatarUrl !== undefined) setAvatarUrl(patch.avatarUrl)
  }

  function handleLogoutConfirm() {
    setLogoutOpen(false)
    onLogout()
  }

  return (
    <div className="authenticated-app">
      <HomePage onOpenAccount={openProfile} />

      <SlideStack active={profileOpen} direction={direction}>
        <SlidePage visible={route === 'profile'} direction={direction}>
          <ProfilePage
            user={user}
            nickname={nickname}
            avatarUrl={avatarUrl}
            onNavigate={openSubPage}
            onBack={goBack}
            onLogoutRequest={() => setLogoutOpen(true)}
          />
        </SlidePage>

        <SlidePage visible={route === 'account-settings'} direction={direction}>
          <AccountSettingsPage
            nickname={nickname}
            avatarUrl={avatarUrl}
            onBack={goBack}
            onSave={handleSaveProfile}
          />
        </SlidePage>

        <SlidePage visible={route === 'family'} direction={direction}>
          <FamilyManagementPage
            families={families}
            onBack={goBack}
            onChange={setFamilies}
          />
        </SlidePage>

        {user.role === 'admin' ? (
          <SlidePage visible={route === 'admin-users'} direction={direction}>
            <AdminUsersPage
              user={user}
              onBack={goBack}
              onUserUpdated={onUserUpdated}
            />
          </SlidePage>
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
