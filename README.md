# MikWeb

Mik Casual 官网与内容站点，支持 `zh-CN` / `en` 双语，包含官网页面、Wiki、建筑展示、封禁列表、公告代理接口以及 MCP 服务端点。

## 快速开始

```bash
bun install
cp .env.example .env
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

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `MINECRAFT_SERVER_URL` | ✓ | 主服务器 API 地址 |
| `TOTP_SECRET` | — | 主服务器签名密钥，随请求头 `X-TOTP-Token` 转发 |
| `MINECRAFT_SERVER_ADDRESS` | — | 在线人数回退查询地址 |
| `MINECRAFT_SERVER_PORT` | — | 在线人数回退查询端口，默认 `25565` |
| `BUILDINGS_SERVER_URL` | — | 建筑服务地址，默认回退到 `MINECRAFT_SERVER_URL` |
| `BUILDINGS_TOTP_SECRET` | — | 建筑服务签名密钥，默认回退到 `TOTP_SECRET` |
| `NEXT_PUBLIC_BASE_URL` | — | 对外基础地址，默认 `http://localhost:3000` |

生成密钥：

```bash
openssl rand -hex 32
```

## API 路由

除 `GET /api/mcp` 外，其余 `/api/*` 路由均通过 `src/shared/api/proxy-route.ts` 代理上游服务。

| 路由 | 说明 |
|------|------|
| `GET /api/players/online` | 在线玩家与人数；主接口失败时可回退查询 |
| `GET /api/players/history` | 历史在线人数曲线 |
| `GET /api/players/:uuid/history` | 单个玩家会话历史 |
| `GET /api/announcements` | 公告列表 |
| `GET /api/buildings` | 建筑列表 |
| `GET /api/bans` | 封禁列表 |
| `GET /api/mcp` | MCP 工具入口 |

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
      "args": ["-y", "mcp-remote", "https://mik.noctiro.moe/api/mcp"]
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
