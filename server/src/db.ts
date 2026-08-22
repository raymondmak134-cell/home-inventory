import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type UserRow = {
  id: number
  username: string
  password_hash: string
  created_at: string
}

export type PublicUser = {
  id: number
  username: string
  createdAt: string
}

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return resolve(process.env.DATABASE_PATH)
  }
  return resolve(process.cwd(), 'data', 'jiawucang.sqlite')
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
  return db
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
  }
}

export function findUserByUsername(
  db: DatabaseSync,
  username: string,
): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, username, password_hash, created_at
       FROM users
       WHERE username = ? COLLATE NOCASE`,
    )
    .get(username.trim()) as UserRow | undefined
}

export function findUserById(
  db: DatabaseSync,
  id: number,
): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, username, password_hash, created_at
       FROM users
       WHERE id = ?`,
    )
    .get(id) as UserRow | undefined
}

export function createUser(
  db: DatabaseSync,
  username: string,
  passwordHash: string,
): UserRow {
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash)
       VALUES (?, ?)
       RETURNING id, username, password_hash, created_at`,
    )
    .get(username.trim(), passwordHash) as UserRow
  return result
}
