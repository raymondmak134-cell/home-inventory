export type UserProfile = {
  nickname: string
  avatarUrl: string | null
}

export type FamilyMember = {
  id: number
  name: string
  createdAt: string
}

export type Family = {
  id: number
  name: string
  createdAt: string
  members: FamilyMember[]
}

export type ProfilePayload = {
  profile: UserProfile
  families: Family[]
}

export type ProfileError = {
  code: string
  message: string
  field?: 'password'
}

type ProfileFailure = { error: ProfileError }

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T | ProfileFailure> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = (await parseJson(response)) as T | ProfileFailure | null
  if (!body || typeof body !== 'object') {
    return { error: { code: 'NETWORK', message: '网络异常，请稍后重试' } }
  }
  if (!response.ok) {
    if ('error' in body && body.error) return body as ProfileFailure
    return { error: { code: 'UNKNOWN', message: '请求失败，请稍后重试' } }
  }
  return body as T
}

export async function fetchProfile(): Promise<ProfilePayload | ProfileFailure> {
  return request<ProfilePayload>('/api/profile')
}

export async function updateProfile(patch: {
  nickname?: string
  avatarUrl?: string | null
}): Promise<{ profile: UserProfile } | ProfileFailure> {
  return request<{ profile: UserProfile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | ProfileFailure> {
  return request<{ ok: true }>('/api/profile/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function createFamily(
  name: string,
): Promise<{ family: Family } | ProfileFailure> {
  return request<{ family: Family }>('/api/profile/families', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function deleteFamilyApi(id: number): Promise<{ ok: true } | ProfileFailure> {
  return request<{ ok: true }>(`/api/profile/families/${id}`, {
    method: 'DELETE',
  })
}

export async function addFamilyMemberApi(
  familyId: number,
  name: string,
): Promise<{ member: FamilyMember } | ProfileFailure> {
  return request<{ member: FamilyMember }>(`/api/profile/families/${familyId}/members`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function removeFamilyMemberApi(
  familyId: number,
  memberId: number,
): Promise<{ ok: true } | ProfileFailure> {
  return request<{ ok: true }>(
    `/api/profile/families/${familyId}/members/${memberId}`,
    { method: 'DELETE' },
  )
}
