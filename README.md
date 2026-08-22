# 家仓 / 家物仓

家庭物品清单应用。当前已接入账号注册 / 登录后端。

## 技术栈

- 前端：Vite 8 + React 19 + TypeScript
- 后端：Hono + Node.js 22 `node:sqlite` + bcryptjs 会话 Cookie
- pnpm workspace（根目录前端 + `server/` API）
- Vitest + Testing Library / Oxlint

## 本地开发

```bash
pnpm install
# 终端 1：API（默认 http://127.0.0.1:3000）
pnpm dev:server
# 终端 2：前端（默认 http://0.0.0.0:5173，已代理 /api）
pnpm dev
```

## 账号 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 注册并建立会话 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 退出 |
| `GET` | `/api/auth/me` | 当前登录用户 |

密码使用 bcrypt 哈希；会话为 httpOnly Cookie（`jiawucang_session`）。

生产环境请设置：

- `SESSION_SECRET`（≥16 字符）
- `DATABASE_PATH`（SQLite 文件路径）
- `PORT` / `HOST`（默认 `3000` / `127.0.0.1`）

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动前端开发服务器 |
| `pnpm dev:server` | 启动账号 API |
| `pnpm test` | 前端测试 |
| `pnpm test:server` | 后端测试 |
| `pnpm test:all` | 前后端测试 |
| `pnpm lint` | 静态检查 |
| `pnpm build` | 类型检查并构建前端 |
| `pnpm preview` | 预览生产构建 |

服务器一键部署脚本：`scripts/deploy-on-server.sh`（静态站点 + systemd API + nginx `/api` 反代）。
