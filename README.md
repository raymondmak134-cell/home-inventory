# 家物仓

轻量家庭物品清单：记录名称、存放位置、数量与备注，数据保存在浏览器本地。

## 开发

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:5173](http://localhost:5173)。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（`0.0.0.0:5173`） |
| `pnpm test` | 运行单元 / 组件测试 |
| `pnpm lint` | Oxlint 静态检查 |
| `pnpm build` | 类型检查并产出生产构建 |
| `pnpm preview` | 预览生产构建 |

## 技术栈

- Vite + React 19 + TypeScript
- Vitest + Testing Library
- 本地 `localStorage` 持久化
