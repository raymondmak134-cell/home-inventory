export const appRoutes = {
  home: '/',
  profile: '/profile',
  profileSettings: '/profile/settings',
  profileFamilies: '/profile/families',
  profileAdminUsers: '/profile/admin/users',
} as const

export type ProfilePath =
  | typeof appRoutes.profile
  | typeof appRoutes.profileSettings
  | typeof appRoutes.profileFamilies
  | typeof appRoutes.profileAdminUsers

export type AuthenticatedPath = typeof appRoutes.home | ProfilePath

export function isProfilePath(pathname: string): boolean {
  return pathname === appRoutes.profile || pathname.startsWith(`${appRoutes.profile}/`)
}

export function profilePathToMenuKey(
  pathname: string,
): 'profile' | 'account-settings' | 'family' | 'admin-users' {
  if (pathname === appRoutes.profileSettings) return 'account-settings'
  if (pathname === appRoutes.profileFamilies) return 'family'
  if (pathname === appRoutes.profileAdminUsers) return 'admin-users'
  return 'profile'
}

export function menuKeyToPath(
  key: 'account-settings' | 'family' | 'admin-users',
): ProfilePath {
  if (key === 'account-settings') return appRoutes.profileSettings
  if (key === 'family') return appRoutes.profileFamilies
  return appRoutes.profileAdminUsers
}

export function profileBackPath(pathname: string): AuthenticatedPath {
  if (pathname === appRoutes.profile) return appRoutes.home
  return appRoutes.profile
}

export function routeDepth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length
}
