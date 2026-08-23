# 家仓 / 家物仓

家庭物品清单应用。当前已接入账号注册 / 登录后端。

## 技术栈

- 前端：Vite 8 + React 19 + TypeScript
- 后端：Hono + Node.js 22 `node:sqlite` + bcryptjs 会话 Cookie
- pnpm workspace（根目录前端 + `server/` API）
- Vitest + Testing Library / Oxlint

## 商品查询与入库架构

扫码得到条码后，前端调用：

`GET /api/products/barcode/:code`

服务端处理流程：

1. **本地命中**：`products` 表已有该条码 → 直接返回（`fromCache: true`）
2. **本地未命中**：服务端调用探数 API（`TANSHU_API_KEY` 仅存在于服务端）
   - **查到**：下载商品图片到 `server/data/uploads/products/`，写入 `products` 表，再返回
   - **查不到**：写入 `barcode_misses` 未命中记录，返回 `PRODUCT_NOT_FOUND`，前端引导手动添加

确认入库时，前端调用 `POST /api/inventory/items`，传 `{ productId }`；手动添加则传 `{ goodsName, brand, spec, barcode? }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/products/barcode/:code` | 查询商品（本地缓存优先） |
| `GET` | `/api/uploads/products/:filename` | 读取本地缓存的商品图片 |
| `GET` | `/api/inventory/items` | 当前用户的入库物品列表 |
| `POST` | `/api/inventory/items` | 入库（`productId` 或手动字段） |

## 探数条形码 API 配置

1. 复制环境变量模板：`cp .env.example .env.local`
2. 填入探数个人中心的 `TANSHU_API_KEY`
3. 启动 `pnpm dev:server` 时自动读取（密钥不会暴露到浏览器）

可选：`UPLOADS_PATH` 指定图片存储目录（默认 `server/data/uploads`）。

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
