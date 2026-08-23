import type { DatabaseSync } from 'node:sqlite'

export type UserProfile = {
  nickname: string
  avatarUrl: string | null
}

export type FamilyMemberRow = {
  id: number
  familyId: number
  name: string
  createdAt: string
}

export type FamilyRow = {
  id: number
  userId: number
  name: string
  createdAt: string
  members: FamilyMemberRow[]
}

const MAX_AVATAR_URL_LENGTH = 600_000
const MAX_NICKNAME_LENGTH = 20
const MAX_FAMILY_NAME_LENGTH = 40
const MAX_MEMBER_NAME_LENGTH = 20

export function ensureProfileTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      nickname TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_families_user_id ON families(user_id);
    CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
  `)
}

export function getUserProfile(db: DatabaseSync, userId: number): UserProfile {
  const row = db
    .prepare(
      `SELECT nickname, avatar_url
       FROM user_profiles
       WHERE user_id = ?`,
    )
    .get(userId) as { nickname: string; avatar_url: string | null } | undefined

  if (!row) {
    return { nickname: '', avatarUrl: null }
  }

  return {
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
  }
}

export function upsertUserProfile(
  db: DatabaseSync,
  userId: number,
  patch: { nickname?: string; avatarUrl?: string | null },
): UserProfile {
  const current = getUserProfile(db, userId)
  const nickname =
    patch.nickname !== undefined ? patch.nickname.trim() : current.nickname
  const avatarUrl =
    patch.avatarUrl !== undefined ? patch.avatarUrl : current.avatarUrl

  if (nickname.length > MAX_NICKNAME_LENGTH) {
    throw new Error('NICKNAME_TOO_LONG')
  }
  if (avatarUrl && avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
    throw new Error('AVATAR_TOO_LARGE')
  }

  db.prepare(
    `INSERT INTO user_profiles (user_id, nickname, avatar_url, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       nickname = excluded.nickname,
       avatar_url = excluded.avatar_url,
       updated_at = datetime('now')`,
  ).run(userId, nickname, avatarUrl)

  return { nickname, avatarUrl }
}

export function listFamilies(db: DatabaseSync, userId: number): FamilyRow[] {
  const families = db
    .prepare(
      `SELECT id, user_id, name, created_at
       FROM families
       WHERE user_id = ?
       ORDER BY datetime(created_at) ASC, id ASC`,
    )
    .all(userId) as Array<{
    id: number
    user_id: number
    name: string
    created_at: string
  }>

  const membersByFamily = new Map<number, FamilyMemberRow[]>()
  for (const family of families) {
    const members = db
      .prepare(
        `SELECT id, family_id, name, created_at
         FROM family_members
         WHERE family_id = ?
         ORDER BY datetime(created_at) ASC, id ASC`,
      )
      .all(family.id) as Array<{
      id: number
      family_id: number
      name: string
      created_at: string
    }>

    membersByFamily.set(
      family.id,
      members.map((member) => ({
        id: member.id,
        familyId: member.family_id,
        name: member.name,
        createdAt: member.created_at,
      })),
    )
  }

  return families.map((family) => ({
    id: family.id,
    userId: family.user_id,
    name: family.name,
    createdAt: family.created_at,
    members: membersByFamily.get(family.id) ?? [],
  }))
}

function findFamilyForUser(
  db: DatabaseSync,
  userId: number,
  familyId: number,
): { id: number; user_id: number; name: string; created_at: string } | undefined {
  return db
    .prepare(
      `SELECT id, user_id, name, created_at
       FROM families
       WHERE id = ? AND user_id = ?`,
    )
    .get(familyId, userId) as
    | { id: number; user_id: number; name: string; created_at: string }
    | undefined
}

export function createFamily(
  db: DatabaseSync,
  userId: number,
  name: string,
): FamilyRow {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('FAMILY_NAME_REQUIRED')
  if (trimmed.length > MAX_FAMILY_NAME_LENGTH) throw new Error('FAMILY_NAME_TOO_LONG')

  const row = db
    .prepare(
      `INSERT INTO families (user_id, name)
       VALUES (?, ?)
       RETURNING id, user_id, name, created_at`,
    )
    .get(userId, trimmed) as {
    id: number
    user_id: number
    name: string
    created_at: string
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    members: [],
  }
}

export function deleteFamily(
  db: DatabaseSync,
  userId: number,
  familyId: number,
): boolean {
  const result = db
    .prepare(`DELETE FROM families WHERE id = ? AND user_id = ?`)
    .run(familyId, userId)
  return Number(result.changes) > 0
}

export function addFamilyMember(
  db: DatabaseSync,
  userId: number,
  familyId: number,
  name: string,
): FamilyMemberRow {
  const family = findFamilyForUser(db, userId, familyId)
  if (!family) throw new Error('FAMILY_NOT_FOUND')

  const trimmed = name.trim()
  if (!trimmed) throw new Error('MEMBER_NAME_REQUIRED')
  if (trimmed.length > MAX_MEMBER_NAME_LENGTH) throw new Error('MEMBER_NAME_TOO_LONG')

  const row = db
    .prepare(
      `INSERT INTO family_members (family_id, name)
       VALUES (?, ?)
       RETURNING id, family_id, name, created_at`,
    )
    .get(familyId, trimmed) as {
    id: number
    family_id: number
    name: string
    created_at: string
  }

  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    createdAt: row.created_at,
  }
}

export function removeFamilyMember(
  db: DatabaseSync,
  userId: number,
  familyId: number,
  memberId: number,
): boolean {
  const family = findFamilyForUser(db, userId, familyId)
  if (!family) return false

  const result = db
    .prepare(`DELETE FROM family_members WHERE id = ? AND family_id = ?`)
    .run(memberId, familyId)
  return Number(result.changes) > 0
}

export {
  MAX_AVATAR_URL_LENGTH,
  MAX_FAMILY_NAME_LENGTH,
  MAX_MEMBER_NAME_LENGTH,
  MAX_NICKNAME_LENGTH,
}
