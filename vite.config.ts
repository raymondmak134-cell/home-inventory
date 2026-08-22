import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const TANSHU_BARCODE_ENDPOINT =
  'https://api2.tanshuapi.com/api/barcode/v1/index'

function createTanshuBarcodeProxy(apiKey: string): Connect.NextHandleFunction {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    _next: Connect.NextFunction,
  ) => {
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: '仅支持 GET 请求' }))
      return
    }

    const requestUrl = new URL(req.url ?? '', 'http://localhost')
    const barcode = requestUrl.searchParams.get('barcode')?.trim()

    if (!barcode) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: '缺少 barcode 参数' }))
      return
    }

    const upstreamUrl = new URL(TANSHU_BARCODE_ENDPOINT)
    upstreamUrl.searchParams.set('key', apiKey)
    upstreamUrl.searchParams.set('barcode', barcode)

    try {
      const upstream = await fetch(upstreamUrl)
      const body = await upstream.text()

      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(body)
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: '无法连接探数 API，请稍后重试' }))
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const tanshuApiKey = env.TANSHU_API_KEY?.trim()

  return {
    plugins: [
      react(),
      {
        name: 'tanshu-barcode-proxy',
        configureServer(server) {
          server.middlewares.use('/api/barcode', (req, res, next) => {
            if (!tanshuApiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  error:
                    '未配置 TANSHU_API_KEY，请复制 .env.example 为 .env.local 并填入密钥',
                }),
              )
              return
            }

            void createTanshuBarcodeProxy(tanshuApiKey)(req, res, next)
          })
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  }
})
