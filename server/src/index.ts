import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createDatabase } from './db.ts'

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
