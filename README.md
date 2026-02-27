# Mik Casual 服务器官网

一个基于 Next.js 的 Minecraft 服务器官网，内置反向代理功能。

## 功能特性

- 🎮 实时显示在线玩家数
- 📢 服务器公告系统
- 🏗️ 建筑收录展示（支持筛选原创/复刻）
- 🔄 内置 API 反向代理
- 📱 完全响应式设计
- ⚡ 基于 Next.js 15 + TypeScript

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，然后修改配置：

```env
# Minecraft 服务器 API 地址
MINECRAFT_SERVER_URL=http://your-minecraft-server:8080

# 如果需要 API Key
MINECRAFT_API_KEY=your-api-key-here
```

### 3. 运行开发服务器

```bash
bun dev
```

访问 http://localhost:3000 查看网站。

## API 路由说明

本项目内置了 3 个 API 路由，用于代理 Minecraft 服务器的数据：

### 1. 获取在线玩家数

**路由**: `GET /api/players`

**后端 API 格式**:
```json
{
  "count": 5
}
```

### 2. 获取服务器公告

**路由**: `GET /api/announcements`

**后端 API 格式**:
```json
[
  {
    "timestamp": 1234567890,
    "content": "公告内容"
  }
]
```

### 3. 获取建筑收录

**路由**: `GET /api/buildings`

**后端 API 格式**:
```json
[
  {
    "id": 1,
    "name": "建筑名称",
    "description": "建筑描述",
    "coordinates": {
      "x": 100,
      "y": 64,
      "z": -200
    },
    "builder": "建造者名称",
    "isOriginal": true,
    "imageUrl": "/buildings/image.png",
    "buildDate": "2024-01-15",
    "category": "建筑分类"
  }
]
```

## 降级策略

如果无法连接到 Minecraft 服务器，API 路由会自动返回模拟数据，确保网站正常显示。

## 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/mik-casual-web.git
git push -u origin main
```

### 2. 在 Vercel 导入项目

1. 访问 https://vercel.com
2. 点击 "Import Project"
3. 选择你的 GitHub 仓库
4. 配置环境变量：
   - `MINECRAFT_SERVER_URL`: 你的 Minecraft 服务器地址
   - `MINECRAFT_API_KEY`: API Key（如果需要）

### 3. 部署

Vercel 会自动构建和部署你的项目。

## 自定义配置

### 修改服务器信息

编辑 `app/page.tsx` 中的以下内容：

- 服务器名称和标语
- 申请链接
- 地图链接
- Wiki 链接

### 添加建筑图片

将建筑图片放在 `public/buildings/` 目录下，然后在后端 API 中返回对应的路径。

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Lucide React (图标)

## 许可证

MIT License
