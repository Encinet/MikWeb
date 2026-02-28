# Mik Casual 服务器官网

一个基于 Next.js 的 Mik Casual 服务器官网，支持国际化、主题切换和完整的服务器数据展示。

## 开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
# Minecraft 服务器 API 地址
MINECRAFT_SERVER_URL=http://your-minecraft-server:8080

# API Key（可选）
MINECRAFT_API_KEY=your-api-key-here
```

### 3. 运行开发服务器

```bash
bun dev
```

访问 http://localhost:3000 查看网站。

### 4. 构建生产版本

```bash
bun run build
bun start
```

## API 文档

本项目内置了 4 个 API 路由，用于代理 Minecraft 服务器的数据。所有 API 都支持通过 `X-API-Key` 请求头传递认证密钥。

### 1. 获取在线玩家

**端点**: `GET /api/players`

**描述**: 获取当前在线玩家数量和玩家列表

**请求头**:
```
X-API-Key: your-api-key (可选)
```

**响应格式**:
```json
{
  "count": 3,
  "players": [
    {
      "name": "Steve",
      "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5"
    },
    {
      "name": "Alex",
      "uuid": "8667ba71-b85a-4004-af54-457a9734eed7"
    }
  ]
}
```

**字段说明**:
- `count` (number): 在线玩家数量
- `players` (array): 玩家列表
  - `name` (string): 玩家名称
  - `uuid` (string): 玩家 UUID

**缓存策略**: 30 秒公共缓存，60 秒 stale-while-revalidate

---

### 2. 获取服务器公告

**端点**: `GET /api/announcements`

**描述**: 获取服务器公告列表

**请求头**:
```
X-API-Key: your-api-key (可选)
```

**响应格式**:
```json
[
  {
    "timestamp": 1705305600,
    "content": "服务器将于明天进行维护"
  },
  {
    "timestamp": 1705219200,
    "content": "欢迎新玩家加入！"
  }
}
```

**字段说明**:
- `timestamp` (number): Unix 时间戳（秒）或 ISO 8601 日期字符串
- `content` (string): 公告内容

**缓存策略**: 60 秒公共缓存，120 秒 stale-while-revalidate

---

### 3. 获取建筑收录

**端点**: `GET /api/buildings`

**描述**: 获取服务器建筑收录列表

**请求头**:
```
X-API-Key: your-api-key (可选)
```

**响应格式**:
```json
[
  {
    "name": {
      "zh-CN": "主城大教堂",
      "en": "Main Cathedral"
    },
    "description": {
      "zh-CN": "位于主城中心的宏伟建筑",
      "en": "A magnificent building in the center"
    },
    "coordinates": {
      "x": 100,
      "y": 64,
      "z": -200
    },
    "builders": [
      {
        "name": "Steve",
        "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
        "weight": 100
      },
      {
        "name": "Alex",
        "uuid": "8667ba71-b85a-4004-af54-457a9734eed7",
        "weight": 50
      }
    ],
    "buildType": "original",
    "imageUrl": "/buildings/cathedral.png",
    "buildDate": "2024-01-15",
    "tags": ["religious", "large", "landmark"],
    "source": null
  },
  {
    "name": {
      "zh-CN": "艾菲尔铁塔复刻",
      "en": "Eiffel Tower Replica"
    },
    "description": {
      "zh-CN": "1:1还原的艾菲尔铁塔",
      "en": "A 1:1 replica of the Eiffel Tower"
    },
    "coordinates": {
      "x": 800,
      "y": 64,
      "z": -600
    },
    "builders": [
      {
        "name": "Builder123",
        "uuid": "f84c6a79-0a4e-45e0-879b-cd49ebd4c4e2",
        "weight": 80
      },
      {
        "name": "Helper456",
        "uuid": "b0c69a0b-4e9a-4726-a5be-fca90e38aaf5",
        "weight": 80
      },
      {
        "name": "Assistant789",
        "uuid": "d1e79f4-44e9-4726-a5be-fca90e38aaf5",
        "weight": 40
      }
    ],
    "buildType": "replica",
    "imageUrl": "/buildings/eiffel.png",
    "buildDate": "2024-01-28",
    "tags": ["landmark", "large", "historical"],
    "source": {
      "originalAuthor": "Gustave Eiffel",
      "originalLink": "https://www.planetminecraft.com/project/eiffel-tower",
      "notes": {
        "zh-CN": "基于真实艾菲尔铁塔的1:1复刻",
        "en": "Based on the real Eiffel Tower, 1:1 scale"
      }
    }
  }
]
```

**字段说明**:
- `name` (object): 多语言建筑名称
- `description` (object): 多语言建筑描述
- `coordinates` (object): 建筑坐标
  - `x`, `y`, `z` (number): 三维坐标
- `builders` (array): 建造者列表（按贡献权重排序）
  - `name` (string): 建造者名称
  - `uuid` (string): 建造者 UUID
  - `weight` (number): 贡献权重（数值越大表示贡献越大，相同权重视为贡献相等）
- `buildType` (string): 建筑类型
  - `original`: 原创作品
  - `derivative`: 二创作品
  - `replica`: 搬运作品
- `imageUrl` (string): 建筑图片 URL
- `buildDate` (string): 建造日期（ISO 8601 格式或 Unix 时间戳）
- `tags` (array, 可选): 建筑标签
- `source` (object, 可选): 来源信息（仅非原创作品）
  - `originalAuthor` (string, 可选): 原作者
  - `originalLink` (string, 可选): 原作品链接
  - `notes` (object, 可选): 多语言备注

**注意**: 建筑数据不包含id字段，前端通过坐标、日期和建造者信息的哈希算法生成唯一标识。

**缓存策略**: 300 秒公共缓存，600 秒 stale-while-revalidate

**许可证**: 所有建筑作品遵循 CC BY-NC-SA 4.0 许可证

---

### 4. 获取封禁列表

**端点**: `GET /api/bans`

**描述**: 获取服务器封禁记录列表

**请求头**:
```
X-API-Key: your-api-key (可选)
```

**响应格式**:
```json
[
  {
    "playerName": "Griefer123",
    "playerUuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    "reason": "恶意破坏他人建筑",
    "bannedBy": "Admin",
    "bannedAt": "2024-01-15T10:30:00Z",
    "expiresAt": null,
    "isPermanent": true
  },
  {
    "playerName": "Spammer456",
    "playerUuid": "8667ba71-b85a-4004-af54-457a9734eed7",
    "reason": "频繁发送垃圾信息",
    "bannedBy": "Moderator",
    "bannedAt": "2024-02-10T15:45:00Z",
    "expiresAt": "2024-03-10T15:45:00Z",
    "isPermanent": false
  }
]
```

**字段说明**:
- `playerName` (string): 被封禁玩家名称
- `playerUuid` (string): 被封禁玩家 UUID（作为唯一标识）
- `reason` (string): 封禁原因
- `bannedBy` (string): 执行封禁的管理员
- `bannedAt` (string): 封禁时间（ISO 8601 格式）
- `expiresAt` (string | null): 解封时间（null 表示永久封禁）
- `isPermanent` (boolean): 是否为永久封禁

**缓存策略**: 300 秒公共缓存，600 秒 stale-while-revalidate

---

## 降级策略

如果无法连接到 Minecraft 服务器，所有 API 路由会自动返回模拟数据，确保网站正常显示。降级时会在控制台输出错误日志。

## 国际化

项目支持中文（zh-CN）和英文（en）两种语言。翻译文件位于 `messages/` 目录：

- `messages/zh-CN.json`: 中文翻译
- `messages/en.json`: 英文翻译

### 添加新语言

1. 在 `messages/` 目录创建新的语言文件（如 `ja.json`）
2. 在 `i18n/routing.ts` 中添加新语言到 `locales` 数组
3. 复制现有翻译文件的结构并翻译内容

## 主题系统

项目支持深色和浅色两种主题，使用 CSS 变量实现：

- 深色主题：默认主题，适合夜间浏览
- 浅色主题：使用柔和的阴影替代边框

主题切换按钮位于导航栏右上角。

## 部署

### 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `MINECRAFT_SERVER_URL`: Minecraft 服务器 API 地址
   - `MINECRAFT_API_KEY`: API 密钥（可选）
4. 部署

## 项目结构

```
MikWeb/
├── app/                      # Next.js App Router
│   ├── [locale]/            # 国际化路由
│   │   ├── page.tsx         # 首页
│   │   ├── buildings/       # 建筑收录页
│   │   ├── bans/            # 封禁列表页
│   │   ├── wiki/            # 游戏指南页
│   │   └── layout.tsx       # 布局组件
│   ├── api/                 # API 路由
│   │   ├── players/         # 玩家 API
│   │   ├── announcements/   # 公告 API
│   │   ├── buildings/       # 建筑 API
│   │   └── bans/            # 封禁 API
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── Navbar.tsx           # 导航栏
│   ├── Footer.tsx           # 页脚
│   ├── Background.tsx       # 背景组件
│   └── ThemeProvider.tsx    # 主题提供者
├── messages/                # 国际化翻译
│   ├── zh-CN.json          # 中文
│   └── en.json             # 英文
├── public/                  # 静态资源
├── i18n.ts                 # 国际化配置
├── middleware.ts           # 中间件（语言检测）
└── next.config.ts          # Next.js 配置
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **图标**: Lucide React
- **国际化**: next-intl
- **主题**: next-themes
- **图片优化**: Next.js Image
- **运行时**: Bun

## 自定义配置

### 修改服务器信息

编辑 `messages/zh-CN.json` 和 `messages/en.json` 修改文本内容。

### 修改导航链接

编辑 `components/Navbar.tsx` 中的 `navItems` 数组。

### 添加新页面

1. 在 `app/[locale]/` 目录创建新文件夹
2. 添加 `page.tsx` 文件
3. 在翻译文件中添加对应文本
4. 在 Navbar 中添加导航链接

### 自定义主题颜色

编辑 `app/globals.css` 中的 CSS 变量：

```css
:root,
[data-theme="dark"] {
  --text-primary: #FFFFFF;
  --text-secondary: #FFFFFF;
  /* ... 更多变量 */
}

[data-theme="light"] {
  --text-primary: #000000;
  --text-secondary: #000000;
  /* ... 更多变量 */
}
```

## 开发指南

### 添加新的 API 端点

1. 在 `app/api/` 创建新文件夹
2. 添加 `route.ts` 文件
3. 实现 GET/POST 等方法
4. 配置缓存策略和降级数据

### 玩家头像缓存

项目使用 `MinecraftAvatar` 组件自动缓存玩家头像，支持多服务 fallback：

- 主服务: MineSkin `https://mineskin.eu/helm/{uuid}?size={size}`
- Fallback 1: Minotar `https://minotar.net/avatar/{uuid}/{size}`
- Fallback 2: MC Heads `https://mc-heads.net/avatar/{uuid}/{size}`

当主服务失败时，组件会自动切换到备用服务，确保头像始终可用。
