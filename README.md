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
| `bun run build` | 生产构建 |
| `bun start` | 启动生产服务 |
| `bun run format` | 使用 Biome 格式化项目 |
| `bun run lint` | 运行 Biome 检查 |
| `bun run typecheck` | 运行 TypeScript 类型检查 |
| `bun run check` | 执行 `lint` + `typecheck` |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `MINECRAFT_SERVER_URL` | ✓ | 主服务器 API base URL |
| `TOTP_SECRET` | — | HMAC-Timestamp 密钥，用于签名时间戳，随请求头 `X-TOTP-Token` 转发 |
| `MINECRAFT_SERVER_ADDRESS` | — | Minecraft 服务器地址，供 `GET /api/players` 在主 API 不可用时回退查询 mcstatus / mcapi |
| `MINECRAFT_SERVER_PORT` | — | Minecraft 服务器端口，默认 `25565`，仅用于 `GET /api/players` 的回退查询 |
| `BUILDINGS_SERVER_URL` | — | 建筑服务器 API base URL，默认回退到 `MINECRAFT_SERVER_URL` |
| `BUILDINGS_TOTP_SECRET` | — | 建筑服务器 HMAC-Timestamp 密钥，默认回退到 `TOTP_SECRET` |
| `NEXT_PUBLIC_BASE_URL` | — | MCP 服务器调用的基础 URL，默认 `http://localhost:3000` |

生成 HMAC-Timestamp 密钥（32字节hex）：
```bash
openssl rand -hex 32
```

## API 路由

除 `GET /api/mcp` 外，其余 `/api/*` 路由均通过 `lib/proxyRoute.ts` 代理上游服务，并设置 `Cache-Control`。常规成功响应会带 `X-Proxy-Cache: HIT-OR-MISS`；`/api/players` 在主接口失败且配置了回退地址时，会返回 `X-Cache: FALLBACK`。

| 路由 | 上游 | `cacheMaxAge` | 备注 |
|------|------|---------------|------|
| `GET /api/players` | 主服务器 | `5s` | 主接口失败时可回退查询 `mcstatus.io` / `mcapi.us` |
| `GET /api/announcements` | 主服务器 | `300s` | 公告列表 |
| `GET /api/buildings` | 建筑服务器 | `300s` | 默认回退到主服务器地址 |
| `GET /api/bans` | 主服务器 | `60s` | 封禁列表 |
| `GET /api/mcp` | 本站 API | — | MCP 工具入口，同时导出 `GET` / `POST` |

### 数据结构

<details>
<summary><code>GET /api/players</code></summary>

```ts
{ count: number; players: { name: string; uuid: string }[] }
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
| `search_wiki` | 基于 Markdown 索引做模糊搜索，支持 `query`、`locale`、`limit` |

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

## 项目结构

```text
MikWeb/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx / HomeSection.tsx
│   │   ├── buildings/page.tsx
│   │   ├── bans/page.tsx
│   │   ├── wiki/page.tsx / WikiContent.tsx
│   │   ├── [...rest]/page.tsx      # Wiki 兜底路由
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── ...
│   ├── api/
│   │   ├── players/route.ts
│   │   ├── announcements/route.ts
│   │   ├── buildings/route.ts
│   │   ├── bans/route.ts
│   │   └── mcp/route.ts       # MCP 服务端点
│   ├── globals.css
│   ├── manifest.ts / robots.ts / sitemap.ts
│   └── layout.tsx
├── components/
│   ├── Navbar.tsx          # 导航与在线玩家显示
│   ├── Footer.tsx
│   ├── Background.tsx      # 背景视觉
│   ├── MinecraftAvatar.tsx
│   ├── ScrollReveal.tsx
│   ├── StructuredData.tsx  # SEO JSON-LD
│   └── ThemeProvider.tsx
├── contexts/
│   ├── PlayerContext.tsx
│   └── BuildingsContext.tsx
├── content/                # Wiki Markdown 源文件
│   ├── zh-CN/{getting-started,commands,tips,rules,community}.md
│   └── en/
├── lib/
│   ├── proxyRoute.ts       # API 代理与缓存头
│   ├── clientApi.ts        # 前端请求封装
│   ├── buildings.ts        # 建筑筛选/排序
│   ├── wiki.ts             # Wiki section / locale 定义
│   ├── types.ts
│   └── site.ts
├── messages/               # next-intl 文案
│   ├── zh-CN.json
│   └── en.json
├── i18n/routing.ts         # locales 配置
├── hooks/useHasMounted.ts
├── i18n.ts
├── proxy.ts                # i18n 中间件
├── public/mik-standard-rounded.webp
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 国际化

翻译文案位于 `messages/`，Wiki 文档位于 `content/<locale>/`，路由配置在 `i18n/routing.ts`。新增语言时，需要同时补齐：

1. `i18n/routing.ts` 中的 locale 配置
2. `messages/<locale>.json`
3. `content/<locale>/` 下对应 Markdown 文件

## 构建与部署

```bash
bun run build
bun start
```
