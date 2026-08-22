import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createDatabase } from './db.ts'

function loadEnvFiles() {
  for (const filename of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), '..', filename)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator === -1) continue
      const key = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim()
      if (key && process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

loadEnvFiles()

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'
const secureCookies = process.env.SECURE_COOKIES === 'true'

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production')
  }
  process.env.SESSION_SECRET =
    'dev-only-session-secret-change-me-32chars'
  console.warn('[auth] Using development SESSION_SECRET; set a real secret in production.')
}

const db = createDatabase()
const app = createApp(db, { secureCookies })

serve(
  {
    fetch: app.fetch,
    hostname: host,
    port,
  },
  (info) => {
    console.log(`[api] listening on http://${info.address}:${info.port}`)
  },
)
