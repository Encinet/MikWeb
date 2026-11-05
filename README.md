# MikWeb

Mik Casual 官网与内容站点，支持 `zh-CN` / `en` 双语，包含官网页面、Wiki、建筑展示、封禁列表、公告展示、PCL2 主页以及 MCP 服务端点。

## 快速开始

网站部署在 Vercel。使用 Bun 安装依赖，构建和运行需要 Node.js 22 或更高版本。

```bash
bun install
bun dev
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun dev` | 启动开发服务器 |
| `bun run build` | 生产构建 |
| `bun start` | 启动生产服务 |
| `bun fix` | 自动修正 Biome 可处理的问题 |
| `bun check:wiki` | 校验 Wiki 元信息、分组目录、章节结构与双语文件配对 |
| `bun check:i18n` | 校验双语翻译键、ICU 语法与插值参数 |
| `bun check` | 执行代码检查、类型检查、翻译校验和 Wiki 校验 |
| `bun test` | 执行聊天及浏览器兼容逻辑回归测试 |
| `bun test:compat` | 执行浏览器 API 缺失时的菜单、焦点和请求取消回归测试 |

## 浏览器兼容

构建目标为 Chrome / Edge 111+、Firefox 128+、Safari / iOS Safari 16.4+，与 [Next.js](https://nextjs.org/docs/architecture/supported-browsers) 和 [Tailwind CSS v4](https://tailwindcss.com/docs/compatibility) 的支持范围一致。旧版目标配置不能让框架本身兼容更旧的浏览器。

聊天菜单优先使用原生 Popover；缺少接口时使用 Portal，保留键盘导航、外部点击关闭和焦点返回。登录请求取消不依赖 `AbortSignal.any()`。`bun check` 将警告视为失败，避免 CSS 优先级警告重新进入代码。兼容逻辑测试使用 DOM 模拟环境，真实布局和系统键盘行为仍需在 Firefox、macOS Safari 和 iOS Safari 中验收。

页面启用 `viewport-fit=cover`，通过 `env(safe-area-inset-*)` 处理四边安全区域。固定聊天界面和共享弹窗使用 `VisualViewport` 的可见尺寸与偏移应对键盘、地址栏和横竖屏变化；缺少该接口时回退到窗口尺寸，首屏 CSS 按 `dvh/svh/lvh → vh` 降级。浮动菜单在安全区内定位，页面保留手动缩放。

## 网页应用安装

安装信息由 `/zh-CN/manifest.webmanifest` 和 `/en/manifest.webmanifest` 提供，两种语言共用应用标识 `/` 和运行范围 `/`，名称统一为 `Mik Casual`，启动页保持安装时的语言。

在支持相应能力的平台上，安装后可从图标的快捷菜单进入网页聊天、世界地图和游戏指南。manifest 提供普通图标、不透明自适应图标，以及中英文各一组桌面和手机真实界面截图，供平台展示安装预览。

## 结构

源码统一放在 `src/`：

```text
src/
  app/
  modules/
  site/
  shared/
```

- `app`：路由入口、layout、metadata、API handlers
- `modules`：按业务或页面切片组织的功能模块，内部可包含 `model`、`lib`、`server`、`ui`
- `site`：站点壳层与全局能力，如 header、footer、background、seo、providers
- `shared`：共享基础能力和站点常量（`shared/config/site-config.ts`）

Logo、favicon 和安装图标集中在 `public/brand/`，页面图片位于 `public/images/`，由 Metadata API 声明图标标签。资源维护、协作规则、命名约定和 Wiki 规范见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 项目路由

MikWeb 不代理 Minecraft 后端数据。玩家、建筑、封禁和公告数据固定从 `https://data.mcmik.top/api` 读取。

本站保留的动态入口：

- `POST /api/mcp`：MCP 工具入口
- `GET|POST|DELETE /api/auth/*`：网页登录 BFF，只在服务端转发到 Mik Data
- `POST /api/account/*`：玩家账号 BFF，只在服务端转发到 Mik Data
- `POST /api/account/images/upload`：玩家建筑申请图片上传代理，只接受已登录成员上传的 WebP，并在服务端转发到 ImgBB
- `GET /api/map/worlds`：读取公开地图的世界目录，校验并仅返回坐标定位所需的名称、显示名和维度类型，缓存 5 分钟
- `GET /:locale/pcl2`：PCL2 主页；浏览器访问显示说明页，PCL2 请求返回对应语言的 XAML

## 登录配置

网页登录使用游戏内验证码或 Passkey，登录请求经 MikWeb 服务端转发至 Mik Data。

本地开发可复制 `.env.example` 为 `.env.local`：

| Variable | Required | Purpose |
|----------|----------|---------|
| `MIKDATA_AUTH_ORIGIN` | No | Mik Data auth origin，默认 `https://data.mcmik.top` |
| `MIKWEB_AUTH_CLIENT_SECRET` | Yes | MikWeb 到 Mik Data 的服务端共享密钥，必须和 Mik Data 的同名 secret 一致 |
| `IMGBB_API_KEY` | Yes, for building submissions | ImgBB API key，只在 MikWeb 服务端使用，不能暴露给浏览器 |

Passkey 与网页会话在 `/account/security` 管理。敏感操作需要最近 5 分钟内验证身份，可在设置页通过已有 Passkey 或游戏确认完成。已签发的注册挑战独立有效 5 分钟。

网页登录需要配套的 mikdata 和 mik 插件，配置见各项目文档。

建筑申请入口为 `/account/building-submissions`，每个账号最多 10 项待审核申请。图片转换为 WebP 后上传至 ImgBB；文件上限 4 MiB，最低尺寸 960×540，最长边不超过 1920 像素。

## MCP

MCP 端点使用无状态 Streamable HTTP。

`src/app/api/mcp/route.ts` 提供 HTTP 入口，工具定义位于 `src/modules/mcp/server/mcp-handler.ts`：

| 工具 | 说明 |
|------|------|
| `get_players` | 获取当前在线人数和玩家列表 |
| `get_announcements` | 获取公告列表，支持 `count` |
| `get_buildings` | 获取建筑列表 |
| `get_bans` | 获取封禁列表 |
| `search_wiki` | 基于 Markdown 索引做搜索，支持 `searchPhrases`、`locale`、`limit` |

客户端配置示例：

```json
{
  "mcpServers": {
    "mikweb": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcmik.top/api/mcp"]
    }
  }
}
```

## 提交前检查

```bash
bun check
bun run build
```

仅修改 Wiki 时，至少运行：

```bash
bun check:wiki
```

修改界面翻译时，至少运行 `bun check:i18n`；改动翻译键时运行 `bun check`，同时检查代码中的引用。

## 网页聊天

登录后点击导航栏的「网页聊天」进入 `/chat`，支持与游戏互通的公共、staff 和在线私聊。

首次接入时，将插件启动日志的 `Web chat public key` 配置为 Vercel 的 `NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY` 后重新部署；正常重启沿用原密钥。聊天内容通过浏览器到插件的 HPKE 加密传输。

历史记录、草稿和私聊会话列表仅保存在当前浏览器，可在聊天设置中关闭或清空；切换账号时会清除上一账号的数据。断线重连期间保留聊天界面和草稿，私聊和提及通知需主动开启。

会话支持消息预览、置顶和关闭，新消息会重新打开已关闭的会话。消息菜单提供复制、提及和发起私聊；「提及我的」和消息搜索支持玩家、来源与日期筛选。坐标可复制，也可选择真实地图世界后定位。设置中可以调整消息间距、成员栏和上下线动态的显示。

聊天的存储、筛选、坐标识别与 DOM 交互回归测试：`bun run test:chat`。

部署时，将 `chat.mcmik.top/ws` 通过 Cloudflare Tunnel 转发到插件的 `127.0.0.1:35354`，其他路径拒绝。仅允许正式网站 Origin `https://mcmik.top`；完整配置见 mik 项目的 `docs/web-chat.md`。
