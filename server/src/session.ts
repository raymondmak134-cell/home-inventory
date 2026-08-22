import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { findUserById, type PublicUser, toPublicUser } from './db.ts'

export const SESSION_COOKIE = 'jiawucang_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET must be set to a string of at least 16 characters')
  }
  return secret
}

function signToken(sessionId: string): string {
  const digest = createHash('sha256')
    .update(`${sessionId}.${sessionSecret()}`)
    .digest('base64url')
  return `${sessionId}.${digest}`
}

function verifyToken(token: string): string | null {
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null
  const sessionId = token.slice(0, separator)
  const provided = token.slice(separator + 1)
  const expected = createHash('sha256')
    .update(`${sessionId}.${sessionSecret()}`)
    .digest('base64url')
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return sessionId
}

export function createSession(db: DatabaseSync, userId: number): string {
  const sessionId = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES (?, ?, ?)`,
  ).run(sessionId, userId, expiresAt)
  return signToken(sessionId)
}

export function destroySession(db: DatabaseSync, token: string | undefined): void {
  if (!token) return
  const sessionId = verifyToken(token)
  if (!sessionId) return
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId)
}

export function readSessionUser(
  db: DatabaseSync,
  token: string | undefined,
): PublicUser | null {
  if (!token) return null
  const sessionId = verifyToken(token)
  if (!sessionId) return null

  const row = db
    .prepare(
      `SELECT user_id AS userId, expires_at AS expiresAt
       FROM sessions
       WHERE id = ?`,
    )
    .get(sessionId) as { userId: number; expiresAt: string } | undefined

  if (!row) return null
  if (Date.parse(row.expiresAt) <= Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId)
    return null
  }

  const user = findUserById(db, row.userId)
  return user ? toPublicUser(user) : null
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax' as const,
    secure,
    maxAge: SESSION_TTL_MS / 1000,
  }
}
