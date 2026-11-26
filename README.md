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
| 建筑投稿图片上传 | 浏览器生成最长边 3840 像素以内的 WebP、渐进式 JXL 原图（合计最多 4 MiB），以及最长边 800 像素、最多 128 KiB 的 WebP 缩略图。MikWeb 将三个文件原样上传，MikData 校验后返回哈希和 JXL 封面的字节数。 |
| 建筑封面和详情 | 支持 JXL 增量解码的浏览器在列表只取前段，打开详情后从同一位置续传。其他浏览器先显示小 WebP，进入详情后加载原图。 |
| 网页聊天 | 浏览器通过 HTTP/3 直接连接 `chat.mcmik.top`；证书和 UDP 入口由 mikd 部署配置 |
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

## 浏览器安全策略

页面使用每个请求独立的 CSP nonce，HTML 由服务器按请求渲染，不能跨请求缓存。Cache Components 继续缓存可复用的数据。若建筑目录切换图片存储，更新 `CSP_BUILDING_IMAGE_ORIGIN`。验证码 API 的来源取自 `CAP_API_ENDPOINT`，与服务器校验验证码共用端点配置。

生产构建对 Trusted Types 使用 Report-Only。浏览器开发者工具会显示违规记录。配置 `CSP_REPORT_ENDPOINT` 后，支持 Reporting API 的浏览器也会将报告发给该公开 HTTPS 端点。上线前在 Vercel Preview 检查实际 HTML 与 CSP 的 nonce 是否一致，并验证验证码、Vercel Analytics 和客户端导航。清理 Trusted Types 违规后再切换为强制策略。

主域的 HSTS 有效期为两年。启用 `includeSubDomains` 之前，需确认所有子域都能持续提供 HTTPS。

## MCP

端点为 `https://mcmik.top/api/mcp`，使用 Streamable HTTP，提供在线玩家、公告、建筑、封禁和公开 Wiki 查询。

## 贡献

代码约定、Wiki 编辑与提交流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

聊天页的同源 `POST /api/chat/connect` 由 CDN 直接转到 MikData，仅在建立连接时使用。mikd 主动核验短租约并打开可靠实时流，各次历史补传在同一 WebTransport 会话中按需开流，完成后关闭。支持 SharedWorker 时，同一网站登录的页面共享连接、在途历史请求和实时消息写入。聊天页通过 `GET /api/chat/session` 读取网站身份。无 Cookie 时返回静态游客响应，已登录时由同一 CDN 转发给 MikData。
