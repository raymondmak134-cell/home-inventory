# 家物仓

家庭物品清单应用。当前仓库仅包含工程基础设施，产品逻辑与界面需求待补充。

## 技术栈

- Vite 8 + React 19 + TypeScript
- pnpm
- Vitest + Testing Library
- Oxlint

## 探数条形码 API 配置（分步指南）

本项目通过 [探数数据 · 商品条码查询 API](https://www.tanshuapi.com/market/detail-77) 获取商品信息。开发环境下，API Key 保存在本地环境变量中，由 Vite 开发服务器代理转发，**不会暴露到浏览器前端**。

### 第 1 步：注册并获取 API Key

1. 打开 [探数数据官网](https://www.tanshuapi.com/) 并注册/登录。
2. 进入 **个人中心**，找到你的 **API Key**（调试页参数表里的 `key` 就是这一项）。
3. 若尚未购买或领取试用，可在 [商品条码查询](https://www.tanshuapi.com/market/detail-77) 页面购买或免费测试。

### 第 2 步：创建本地环境变量文件

在项目根目录执行：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的密钥：

```env
TANSHU_API_KEY=你的探数API密钥
```

> `.env.local` 已被 Git 忽略，请勿把密钥提交到仓库。

### 第 3 步：安装依赖并启动开发服务器

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173`，在「条形码查询」输入框中输入条码（例如 `6906337301091`），点击 **查询** 即可验证。

### 第 4 步：理解请求链路

```
浏览器  →  GET /api/barcode?barcode=xxx
         ↓（Vite 开发服务器代理，自动附加 key）
探数 API →  https://api2.tanshuapi.com/api/barcode/v1/index?key=...&barcode=xxx
```

相关代码：

- 代理配置：`vite.config.ts`
- 前端调用：`src/api/barcode.ts`
- 类型定义：`src/types/barcode.ts`

### 常见问题

| 现象 | 可能原因 | 处理方式 |
| --- | --- | --- |
| 「未配置 TANSHU_API_KEY」 | 未创建 `.env.local` 或 key 为空 | 按第 2 步配置后**重启** `pnpm dev` |
| 「无效的 key」 | key 复制错误或已失效 | 到个人中心重新复制 |
| 查询无结果 | 条码不在数据库中 | 换一个已知条码测试，如 `6906337301091` |

### 生产环境说明

当前代理仅在 `pnpm dev` 开发模式下生效。若将来部署到公网，需要在后端（如云函数、Node 服务）中保存 `TANSHU_API_KEY` 并做同样的转发，**不要**使用 `VITE_` 前缀把密钥写进前端构建产物。

## 开发

```bash
pnpm install
pnpm dev
```

开发服务器默认监听 `0.0.0.0:5173`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm test` | 运行测试 |
| `pnpm lint` | 静态检查 |
| `pnpm build` | 类型检查并构建 |
| `pnpm preview` | 预览生产构建 |
