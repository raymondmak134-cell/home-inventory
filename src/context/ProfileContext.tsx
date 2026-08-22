import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Family, UserProfile } from '../api/profile'
import { fetchProfile } from '../api/profile'
import {
  appRoutes,
  isProfilePath,
  menuKeyToPath,
  profileBackPath,
  profilePathToMenuKey,
  routeDepth,
  type AuthenticatedPath,
} from '../routes'

type ProfileContextValue = {
  profile: UserProfile
  families: Family[]
  loading: boolean
  error: string
  setProfile: (profile: UserProfile) => void
  setFamilies: (families: Family[]) => void
  reloadProfile: () => Promise<void>
  openProfile: () => void
  openSubPage: (key: 'account-settings' | 'family' | 'admin-users') => void
  goBack: () => void
  profileOpen: boolean
  currentMenuKey: ReturnType<typeof profilePathToMenuKey>
  direction: 'forward' | 'back'
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<UserProfile>({ nickname: '', avatarUrl: null })
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const previousPath = useRef(location.pathname)

  const profileOpen = isProfilePath(location.pathname)
  const currentMenuKey = profilePathToMenuKey(location.pathname)

  async function reloadProfile() {
    setError('')
    const result = await fetchProfile()
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    setProfile(result.profile)
    setFamilies(result.families)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const result = await fetchProfile()
      if (cancelled) return
      if ('error' in result) {
        setError(result.error.message)
      } else {
        setProfile(result.profile)
        setFamilies(result.families)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const prev = previousPath.current
    const next = location.pathname
    if (prev !== next) {
      setDirection(routeDepth(next) >= routeDepth(prev) ? 'forward' : 'back')
      previousPath.current = next
    }
  }, [location.pathname])

  function navigateWithDirection(path: AuthenticatedPath, nextDirection: 'forward' | 'back') {
    setDirection(nextDirection)
    navigate(path)
  }

  function openProfile() {
    navigateWithDirection(appRoutes.profile, 'forward')
  }

  function openSubPage(key: 'account-settings' | 'family' | 'admin-users') {
    navigateWithDirection(menuKeyToPath(key), 'forward')
  }

  function goBack() {
    navigateWithDirection(profileBackPath(location.pathname), 'back')
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        families,
        loading,
        error,
        setProfile,
        setFamilies,
        reloadProfile,
        openProfile,
        openSubPage,
        goBack,
        profileOpen,
        currentMenuKey,
        direction,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext(): ProfileContextValue {
  const value = useContext(ProfileContext)
  if (!value) {
    throw new Error('useProfileContext must be used within ProfileProvider')
  }
  return value
}
