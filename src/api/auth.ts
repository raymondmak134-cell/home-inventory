export type UserRole = 'admin' | 'user'

export type PublicUser = {
  id: number
  username: string
  role: UserRole
  createdAt: string
}

export type AuthError = {
  code: string
  message: string
  field?: 'username' | 'password' | 'confirmPassword' | 'role'
}

type AuthSuccess = { user: PublicUser }
type AuthFailure = { error: AuthError }

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestAuth(
  path: string,
  init?: RequestInit,
): Promise<AuthSuccess | AuthFailure> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = (await parseJson(response)) as AuthSuccess | AuthFailure | null
  if (!body || typeof body !== 'object') {
    return {
      error: {
        code: 'NETWORK',
        message: '网络异常，请稍后重试',
      },
    }
  }
  if (!response.ok) {
    if ('error' in body && body.error) return body
    return {
      error: {
        code: 'UNKNOWN',
        message: '请求失败，请稍后重试',
      },
    }
  }
  if ('user' in body && body.user) return body
  return {
    error: {
      code: 'UNKNOWN',
      message: '请求失败，请稍后重试',
    },
  }
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' })
  if (response.status === 401) return null
  const body = (await parseJson(response)) as AuthSuccess | null
  return body && 'user' in body ? body.user : null
}

export async function registerAccount(
  username: string,
  password: string,
): Promise<AuthSuccess | AuthFailure> {
  return requestAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function loginAccount(
  username: string,
  password: string,
): Promise<AuthSuccess | AuthFailure> {
  return requestAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function logoutAccount(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}
