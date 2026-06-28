# MikWeb

Mik Casual 官网与内容站点，支持 `zh-CN` / `en` 双语，包含官网页面、Wiki、建筑展示、封禁列表、公告展示、PCL2 主页以及 MCP 服务端点。

## 快速开始

```bash
bun install
bun dev
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun dev` | 启动开发服务器 |
| `bun build` | 生产构建 |
| `bun start` | 启动生产服务 |
| `bun fix` | 自动修正 Biome 可处理的问题 |
| `bun check:wiki` | 校验 Wiki 元信息、分组目录、章节结构与双语文件配对 |
| `bun check` | 执行代码检查、类型检查和 Wiki 校验 |

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
- `shared`：共享基础能力

协作规则、命名约定和 Wiki 规范见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 项目路由

MikWeb 不代理 Minecraft 后端数据。玩家、建筑、封禁和公告数据固定从 `https://data.mcmik.top/api` 读取。

本站保留的动态入口：

- `GET /api/mcp`：MCP 工具入口
- `GET|POST|DELETE /api/auth/*`：网页登录 BFF，只在服务端转发到 Mik Data
- `POST /api/account/*`：玩家账号 BFF，只在服务端转发到 Mik Data
- `POST /api/account/images/upload`：玩家建筑申请图片上传代理，只接受已登录成员上传的 WebP，并在服务端转发到 ImgBB
- `GET /:locale/pcl2`：PCL2 主页；浏览器访问显示说明页，PCL2 请求返回对应语言的 XAML

## 登录配置

网页登录只支持游戏内验证码和 Passkey。浏览器只请求 MikWeb，MikWeb 服务端再用共享密钥访问 Mik Data；这个密钥不能放到客户端代码里。

本地开发可复制 `.env.example` 为 `.env.local`：

| Variable | Required | Purpose |
|----------|----------|---------|
| `MIKDATA_AUTH_ORIGIN` | No | Mik Data auth origin，默认 `https://data.mcmik.top` |
| `MIKWEB_AUTH_CLIENT_SECRET` | Yes | MikWeb 到 Mik Data 的服务端共享密钥，必须和 Mik Data 的同名 secret 一致 |
| `IMGBB_API_KEY` | Yes, for building submissions | ImgBB API key，只在 MikWeb 服务端使用，不能暴露给浏览器 |

玩家建筑收入申请使用 `/account/building-submissions`。浏览器会先把图片转换为 WebP 并做最低清晰度检查，然后提交到 `POST /api/account/images/upload`；该路由会再次确认登录状态，再把图片上传到 ImgBB。最终申请提交到 Mik Data 时，Mik Data 会校验正式成员身份、最多 10 个待审核申请、ImgBB 图片 URL、WebP 元数据和建筑 payload。

## MCP

`src/app/api/mcp/route.ts` 暴露以下工具：

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
```

仅修改 Wiki 或文案时，至少运行：

```bash
bun check:wiki
```
