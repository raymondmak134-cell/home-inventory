import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ensureProfileTables } from './profile.ts'

export type UserRole = 'admin' | 'user'

export type UserRow = {
  id: number
  username: string
  password_hash: string
  role: UserRole
  created_at: string
}

export type PublicUser = {
  id: number
  username: string
  role: UserRole
  createdAt: string
}

export const DEFAULT_ADMIN_USERNAME = '13424330500'

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return resolve(process.env.DATABASE_PATH)
  }
  return resolve(process.cwd(), 'data', 'jiawucang.sqlite')
}

function ensureRoleColumn(db: DatabaseSync): void {
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{
    name: string
  }>
  if (!columns.some((column) => column.name === 'role')) {
    db.exec(
      `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
    )
  }
}

export function promoteConfiguredAdmin(db: DatabaseSync): void {
  const adminUsername = (
    process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME
  ).trim()
  if (!adminUsername) return
  db.prepare(
    `UPDATE users
     SET role = 'admin'
     WHERE username = ? COLLATE NOCASE`,
  ).run(adminUsername)
}

export function createDatabase(dbPath = resolveDbPath()): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `)
  ensureRoleColumn(db)
  ensureProfileTables(db)
  promoteConfiguredAdmin(db)
  return db
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: row.created_at,
  }
}

const USER_SELECT = `SELECT id, username, password_hash, role, created_at
                     FROM users`

export function findUserByUsername(
  db: DatabaseSync,
  username: string,
): UserRow | undefined {
  return db
    .prepare(`${USER_SELECT} WHERE username = ? COLLATE NOCASE`)
    .get(username.trim()) as UserRow | undefined
}

export function findUserById(
  db: DatabaseSync,
  id: number,
): UserRow | undefined {
  return db.prepare(`${USER_SELECT} WHERE id = ?`).get(id) as
    | UserRow
    | undefined
}

export function listUsers(db: DatabaseSync): UserRow[] {
  return db
    .prepare(`${USER_SELECT} ORDER BY datetime(created_at) DESC, id DESC`)
    .all() as UserRow[]
}

export function createUser(
  db: DatabaseSync,
  username: string,
  passwordHash: string,
  role: UserRole = 'user',
): UserRow {
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, role)
       VALUES (?, ?, ?)
       RETURNING id, username, password_hash, role, created_at`,
    )
    .get(username.trim(), passwordHash, role) as UserRow
  return result
}

export function updateUser(
  db: DatabaseSync,
  id: number,
  patch: {
    username?: string
    passwordHash?: string
    role?: UserRole
  },
): UserRow | undefined {
  const current = findUserById(db, id)
  if (!current) return undefined

  const username = patch.username?.trim() ?? current.username
  const passwordHash = patch.passwordHash ?? current.password_hash
  const role = patch.role ?? current.role

  return db
    .prepare(
      `UPDATE users
       SET username = ?, password_hash = ?, role = ?
       WHERE id = ?
       RETURNING id, username, password_hash, role, created_at`,
    )
    .get(username, passwordHash, role, id) as UserRow | undefined
}

export function deleteUser(db: DatabaseSync, id: number): boolean {
  const result = db.prepare(`DELETE FROM users WHERE id = ?`).run(id)
  return Number(result.changes) > 0
}

export function countAdmins(db: DatabaseSync): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`)
    .get() as { count: number }
  return Number(row.count)
}

export function destroyUserSessions(db: DatabaseSync, userId: number): void {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId)
}
