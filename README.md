# MikWeb

[Mik Casual](https://mcmik.top) 官网，使用 Next.js，支持中文与英文。提供 Wiki、建筑展示、网页聊天和社区加入入口。

## 本地运行

安装依赖、开发、构建、启动和测试均使用 Bun 1.4.5 或更新版本。

```bash
bun install
cp .env.example .env.local
bun dev
```

打开 <http://localhost:3000>。环境变量按需配置，字段说明见 [.env.example](./.env.example)。

| 功能 | 配置 |
|------|------|
| 登录与账号 | `MIKWEB_AUTH_CLIENT_SECRET`，与 Mik Data 保持一致；`MIKDATA_AUTH_ORIGIN` 默认指向 `https://data.mcmik.top` |
| 建筑投稿图片上传 | 复用登录配置。浏览器将图片最长边缩放至最多 3840 像素，再从同一份像素生成 WebP 和渐进式 JPEG XL。每张图的两个文件合计最多 4 MiB。MikWeb 使用 MikData 签发的两个签名原样上传。MikData 检查文件结构、尺寸和哈希后完成上传。预览优先 JPEG XL，浏览器不支持或加载失败时使用 WebP。 |
| 网页聊天 | `NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY`，取自 Mik 插件启动日志中的 `Web chat public key` |
| 加入社区 | `MATRIX_JOIN_URL` 与 QQ 群入口；QQ 入群码还需配置 Cap 和两组独立的 TOTP 密钥。加入后绑定游戏账号即可入服 |

登录和聊天需要配套的 [Mik Data](https://github.com/Encinet/mikdata) 与 [Mik 插件](https://github.com/Encinet/mik)，部署说明见各自项目文档。私密凭据仅供服务端使用。

## 常用命令

| 命令 | 用途 |
|------|------|
| `bun dev` | 开发服务 |
| `bun run build` | 生产构建 |
| `bun start` | 运行生产服务 |
| `bun check` | 类型、翻译和 Wiki 校验 |
| `bun fmt <文件>` | 格式化指定文件 |
| `bun run test` | 使用 `bun test --isolate tests` 按文件隔离运行回归测试 |

网站部署在 Vercel，Next.js 构建和非 Edge 函数使用 Bun。Vercel 的 Bun 运行时仍处于 Beta，切换后先在 Preview 验证再部署生产。浏览器支持范围见 [.browserslistrc](./.browserslistrc)。

## MCP

端点为 `https://mcmik.top/api/mcp`，使用 Streamable HTTP，提供在线玩家、公告、建筑、封禁和公开 Wiki 查询。

## 贡献

代码约定、Wiki 编辑与提交流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
