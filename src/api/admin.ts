import type { AuthError, PublicUser } from './auth'

type UsersSuccess = { users: PublicUser[] }
type UserSuccess = { user: PublicUser }
type OkSuccess = { ok: true }
type Failure = { error: AuthError }

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestAdmin<T extends object>(
  path: string,
  init?: RequestInit,
): Promise<T | Failure> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = (await parseJson(response)) as T | Failure | null
  if (!body || typeof body !== 'object') {
    return {
      error: { code: 'NETWORK', message: '网络异常，请稍后重试' },
    }
  }
  if (!response.ok) {
    if ('error' in body && body.error) return body as Failure
    return {
      error: { code: 'UNKNOWN', message: '请求失败，请稍后重试' },
    }
  }
  return body as T
}

export async function fetchUsers(): Promise<UsersSuccess | Failure> {
  return requestAdmin<UsersSuccess>('/api/admin/users')
}

export async function updateUserAccount(
  id: number,
  patch: { username?: string; password?: string; role?: 'admin' | 'user' },
): Promise<UserSuccess | Failure> {
  return requestAdmin<UserSuccess>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteUserAccount(
  id: number,
): Promise<OkSuccess | Failure> {
  return requestAdmin<OkSuccess>(`/api/admin/users/${id}`, {
    method: 'DELETE',
  })
}
