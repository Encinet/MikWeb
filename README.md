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
