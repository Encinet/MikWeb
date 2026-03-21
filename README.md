# MikWeb

Mik Casual 服务器官网，基于 Next.js App Router + next-intl，支持 zh-CN / en 双语。

## 快速开始

```bash
bun install
cp .env.example .env  # 编辑环境变量
bun dev
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `MINECRAFT_SERVER_URL` | ✓ | 主服务器 API base URL |
| `MINECRAFT_API_KEY` | — | 主服务器 API Key，随请求头 `X-API-Key` 转发 |
| `BUILDINGS_SERVER_URL` | — | 建筑服务器 API base URL，默认回退到 `MINECRAFT_SERVER_URL` |
| `BUILDINGS_API_KEY` | — | 建筑服务器 API Key，默认回退到 `MINECRAFT_API_KEY` |

## API 路由

所有路由均为后端代理，带内存缓存层，响应头含 `X-Cache: HIT/MISS`。

| 路由 | 上游 | 内存缓存 | HTTP Cache-Control |
|------|------|----------|--------------------|
| `GET /api/players` | 主服务器 | 5s | `public, s-maxage=5, stale-while-revalidate=15` |
| `GET /api/announcements` | 主服务器 | 300s | `public, s-maxage=300, stale-while-revalidate=600` |
| `GET /api/buildings` | 建筑服务器 | 300s | `public, s-maxage=300, stale-while-revalidate=600` |
| `GET /api/bans` | 主服务器 | 60s | `public, s-maxage=60, stale-while-revalidate=120` |

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
{ timestamp: number | string; content: string }[]
// timestamp: Unix 秒 或 ISO 8601
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

无 `id` 字段，前端通过坐标 + 日期 + builders 哈希生成唯一标识。所有建筑遵循 **CC BY-NC-SA 4.0**。
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

## 项目结构

```
MikWeb/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx / HomeClient.tsx
│   │   ├── buildings/page.tsx
│   │   ├── bans/page.tsx
│   │   └── wiki/page.tsx / WikiClient.tsx
│   ├── api/
│   │   ├── players/route.ts
│   │   ├── announcements/route.ts
│   │   ├── buildings/route.ts
│   │   └── bans/route.ts
│   ├── globals.css
│   ├── manifest.ts / robots.ts / sitemap.ts
│   └── layout.tsx
├── components/
│   ├── Navbar.tsx          # 含在线玩家列表
│   ├── Footer.tsx
│   ├── Background.tsx      # 动态背景
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
│   └── proxyRoute.ts       # API 路由代理与缓存
├── messages/               # next-intl 翻译
│   ├── zh-CN.json
│   └── en.json
├── i18n/routing.ts         # locales 配置
├── i18n.ts
├── proxy.ts                # i18n 中间件
└── next.config.ts
```

## 国际化

翻译文件位于 `messages/`，路由配置在 `i18n/routing.ts`。新增语言：在 `locales` 数组追加 locale，并在 `messages/` 和 `content/` 下创建对应目录。

## 构建 & 部署

```bash
bun run build && bun start
```
