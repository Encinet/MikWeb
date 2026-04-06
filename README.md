# MikWeb

Mik Casual 服务器官网，基于 Next.js App Router + `next-intl`，支持 `zh-CN` / `en` 双语，包含官网页面、Wiki、建筑展示、封禁列表、公告代理接口以及 MCP 服务端点。

## 快速开始

```bash
bun install
cp .env.example .env  # 编辑环境变量
bun dev
```

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `bun dev` | 启动开发服务器 |
| `bun build` | 生产构建 |
| `bun start` | 启动生产服务 |
| `bun fix` | 自动修正 Biome 可处理的问题 |
| `bun check:wiki` | 校验 Wiki 元信息、分组目录、章节结构与多语言文件配对 |
| `bun check` | 执行代码检查、类型检查和 Wiki 校验 |

协作流程、Wiki 规范、目录约定和多语言维护说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `MINECRAFT_SERVER_URL` | ✓ | 主服务器 API base URL |
| `TOTP_SECRET` | — | HMAC-Timestamp 密钥，用于签名时间戳，随请求头 `X-TOTP-Token` 转发 |
| `MINECRAFT_SERVER_ADDRESS` | — | Minecraft 服务器地址，供 `GET /api/players/online` 在主 API 不可用时回退查询 mcstatus / mcapi |
| `MINECRAFT_SERVER_PORT` | — | Minecraft 服务器端口，默认 `25565`，仅用于 `GET /api/players/online` 的回退查询 |
| `BUILDINGS_SERVER_URL` | — | 建筑服务器 API base URL，默认回退到 `MINECRAFT_SERVER_URL` |
| `BUILDINGS_TOTP_SECRET` | — | 建筑服务器 HMAC-Timestamp 密钥，默认回退到 `TOTP_SECRET` |
| `NEXT_PUBLIC_BASE_URL` | — | MCP 服务器调用的基础 URL，默认 `http://localhost:3000` |

生成 HMAC-Timestamp 密钥（32字节 hex）：

```bash
openssl rand -hex 32
```

## API 路由

除 `GET /api/mcp` 外，其余 `/api/*` 路由均通过 `lib/proxyRoute.ts` 代理上游服务，并设置 `Cache-Control`。代理层会对真实上游请求做进程内串行限速，默认平滑到 `10 req/s`。常规成功响应会带 `X-Proxy-Cache`（`MISS` / `HIT` / `STALE` / `COALESCED`）与 `X-Proxy-Source`（`UPSTREAM` / `FALLBACK`）；`/api/players/online` 在主接口失败且配置了回退地址时，会额外返回 `X-Cache: FALLBACK`。

| 路由 | 上游 | `cacheMaxAge` | 备注 |
|------|------|---------------|------|
| `GET /api/players/online` | 主服务器 | `no-store` | 在线玩家与人数；服务端额外做 `5s` 内存缓存和 `15s` 陈旧回源刷新，主接口失败时可回退查询 `mcstatus.io` / `mcapi.us` |
| `GET /api/players/history` | 主服务器 | `to < now` 时 `300s`，否则 `no-store` | 转发 `from` / `to` / `interval` 查询参数，其中 `interval` 为秒级整数 |
| `GET /api/players/:uuid/history` | 主服务器 | `no-store` | 转发玩家会话历史查询 |
| `GET /api/announcements` | 主服务器 | `300s` | 公告列表 |
| `GET /api/buildings` | 建筑服务器 | `300s` | 默认回退到主服务器地址 |
| `GET /api/bans` | 主服务器 | `60s` | 封禁列表 |
| `GET /api/mcp` | 本站 API | — | MCP 工具入口，同时导出 `GET` / `POST` |

### 数据结构

<details>
<summary><code>GET /api/players/online</code></summary>

```ts
{ online: number; players: { name: string; uuid: string; joined_at: string }[] }
```
</details>

<details>
<summary><code>GET /api/players/history</code></summary>

```ts
{
  meta: {
    from: string;
    to: string;
    interval: number; // 秒
    total_points: number;
  };
  summary: {
    peak_online: number;
    peak_time: string | null;
    avg_online: number;
    total_unique_players: number;
  };
  data: {
    timestamp: string;
    online: number;
    players: string[];
  }[];
}
```
</details>

<details>
<summary><code>GET /api/players/:uuid/history</code></summary>

```ts
{
  uuid: string;
  name: string;
  sessions: {
    joined_at: string;
    left_at: string | null;
    duration_min?: number;
  }[];
  stats: {
    total_sessions: number;
    total_hours: number;
    first_seen: string | null;
  };
}
```
</details>

<details>
<summary><code>GET /api/announcements</code></summary>

```ts
{ timestamp: string; content: string }[]
// timestamp: ISO 8601
```
</details>

<details>
<summary><code>GET /api/buildings</code></summary>

```ts
{
  name: Record<string, string>;
  description: Record<string, string>;
  coordinates: { x: number; y: number; z: number };
  builders: { name: string; uuid: string; weight: number }[];  // weight 越大贡献越多
  buildType: "original" | "derivative" | "replica";
  images: string[];        // 首张为封面
  buildDate: string;       // ISO 8601 或 Unix 时间戳
  tags?: Record<string, string>[];  // 多语言，回退顺序: 当前语言 → zh-CN → 首个
  source?: {
    originalAuthor?: string;
    originalLink?: string;
    notes?: Record<string, string>;
  } | null;
}[]
```

前端通过坐标、建造日期和 builder UUID 组合生成稳定 ID。
</details>

<details>
<summary><code>GET /api/bans</code></summary>

```ts
{
  playerName: string;
  playerUuid: string;    // 唯一标识
  reason: string;
  bannedBy: string;
  bannedAt: string;      // ISO 8601
  expiresAt: string | null;
  isPermanent: boolean;
}[]
```
</details>

## MCP 服务器

`app/api/mcp/route.ts` 暴露以下工具：

| 工具 | 说明 |
|------|------|
| `get_players` | 获取当前在线人数和玩家列表 |
| `get_announcements` | 获取公告列表，支持 `count` 参数 |
| `get_buildings` | 获取建筑列表 |
| `get_bans` | 获取封禁列表 |
| `search_wiki` | 基于 Markdown 索引做模糊搜索，支持 `searchPhrases`、`locale`、`limit`，适合一次传入 3-5 个“同一问题的不同说法”来提升命中率 |

### 客户端配置

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

## 贡献

代码改动提交前建议至少运行：

```bash
bun check
```

仅修改 Wiki 或文案时，至少运行：

```bash
bun check:wiki
```

需要自动整理格式和可安全修复的问题时，运行：

```bash
bun fix
```

按角色拆分的协作流程、Wiki 元信息规范、命名约束和目录说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 构建与部署

```bash
bun build
bun start
```
