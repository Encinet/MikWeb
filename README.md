# MikWeb

[Mik Casual](https://mcmik.top) 官网，使用 Next.js，支持中文与英文。提供 Wiki、建筑展示、网页聊天和入服申请。

## 本地运行

需要 Bun 和 Node.js 22+。

```bash
bun install
cp .env.example .env.local
bun dev
```

打开 <http://localhost:3000>。环境变量按需配置，字段说明见 [.env.example](./.env.example)。

| 功能 | 配置 |
|------|------|
| 登录与账号 | `MIKWEB_AUTH_CLIENT_SECRET`，与 Mik Data 保持一致；`MIKDATA_AUTH_ORIGIN` 默认指向 `https://data.mcmik.top` |
| 建筑投稿图片上传 | 服务端 `IMGBB_API_KEY` |
| 网页聊天 | `NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY`，取自 Mik 插件启动日志中的 `Web chat public key` |
| 入服申请 | 表单与 QQ 群入口；入群码还需配置 Cap 和两组独立的 TOTP 密钥 |

登录和聊天需要配套的 [Mik Data](https://github.com/Encinet/mikdata) 与 [Mik 插件](https://github.com/Encinet/mik)，部署说明见各自项目文档。私密凭据仅供服务端使用。

## 常用命令

| 命令 | 用途 |
|------|------|
| `bun dev` | 开发服务 |
| `bun run build` | 生产构建 |
| `bun start` | 运行生产服务 |
| `bun check` | 代码、类型、翻译和 Wiki 校验 |
| `bun test` | 核心回归测试 |

网站部署在 Vercel。浏览器支持范围见 [.browserslistrc](./.browserslistrc)。

## MCP

端点为 `https://mcmik.top/api/mcp`，使用 Streamable HTTP，提供在线玩家、公告、建筑、封禁和公开 Wiki 查询。

## 贡献

代码约定、Wiki 编辑与提交流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
