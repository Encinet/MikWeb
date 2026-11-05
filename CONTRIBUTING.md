# Contributing

协作规则、内容规范和维护边界统一放在这里。项目简介、运行方式、项目路由和 MCP 接入信息见 [README.md](./README.md)。

## 开始

```bash
bun install
bun dev
```

## 检查

| 命令 | 用途 |
|------|------|
| `bun fix` | 自动修正 Biome 可处理的问题 |
| `bun check:wiki` | 校验 Wiki 元信息、分组目录、排序、章节结构和双语配对 |
| `bun check:i18n` | 校验翻译键、中英文 ICU 语法和插值参数 |
| `bun check` | 执行代码检查、类型检查、翻译校验和 Wiki 校验 |

提交前至少执行与改动范围对应的检查；不确定时直接运行：

```bash
bun check
```

## 协作入口

| 类型 | 主要路径 | 提交前至少执行 |
|------|------|------|
| Wiki / 内容编辑 | `content/<locale>/<group>/` | `bun check:wiki` |
| 前端开发 | `src/app/` `src/modules/` `src/site/` `src/shared/` | `bun check` |
| API / MCP 维护 | `src/app/api/` `src/modules/*/server/` `src/shared/api/` | `bun check` |
| 文档 / 翻译维护 | `README.md` `CONTRIBUTING.md` `messages/` `content/<locale>/<group>/` | 按改动范围执行 |

## 结构

```text
src/
  app/
  modules/
  site/
  shared/
```

| 层级 | 路径 | 职责 |
|------|------|------|
| App | `src/app/` | 路由入口、layout、metadata、API handlers |
| Modules | `src/modules/` | 按业务或页面切片组织的模块，内部可包含 `model/lib/server/ui` |
| Site | `src/site/` | 站点壳层能力，如 header、footer、background、seo、providers |
| Shared | `src/shared/` | 无业务语义的通用 API、配置、UI、i18n、types |

## 依赖方向

依赖必须单向收敛：

- `app -> modules/site/shared`
- `site -> modules/shared`
- `modules -> shared`
- 模块可复用其他模块的领域类型、公开组件或数据能力，但不能形成循环依赖。例如首页组合公告与建筑模块，建筑模块复用玩家头像。

如果一个模块需要反向依赖更高层，通常说明它放错层了。跨层引用使用 `@/` 路径；Biome 会阻止 Shared、Modules、Site 反向引用更高层。

站点常量放在 `src/shared/config/site-config.ts`，功能专属常量留在对应模块。页面 metadata 在 `src/app/` 路由入口装配，UI 模块不依赖站点 SEO 实现。

主题默认使用每日配色，按 UTC+8 日期确定色相，并以固定明度、低色度生成默认色；当天保持一致，跨天重新打开时更新，阅读过程中不自动换色。`src/shared/config/theme-config.ts` 的 `DAILY_ACCENT_CHROMA` 控制每日颜色的色度，`DEFAULT_ACCENT_COLOR` 只用于后备色和 PWA 启动画面。`site/theme/lib/accent-color.ts` 用 OKLCH 派生明暗色板、压缩超出 sRGB 的色度并校正对比度；界面使用 `--theme-accent`、`--theme-accent-strong` 和 `--theme-on-accent` 等语义变量。状态色独立。手动选色会在当前浏览器固定保存，在“外观”中选择“今日配色”会清除自定义颜色，恢复每日模式。首次绘制前读取当前日期和已保存的自定义色。

## 命名

- 文件名统一使用 `kebab-case`
- 目录名统一使用 `kebab-case`
- React 组件、Provider、类型名使用 `PascalCase`
- 函数、变量使用 `camelCase`
- 避免新增 `utils.ts`、`helpers.ts`、`common.ts`、`model.ts` 这类泛名文件
- 文件名应直接体现职责，例如 `home-live-overview.tsx`、`building-types.ts`

## 代码规则

- 优先复用现有页面结构、组件职责和共享逻辑
- 路由层只做页面入口、HTTP 导出、运行配置与装配，不堆业务细节；服务端实现归入模块的 `server/`
- 业务代码优先归入对应 `modules/<slice>/`
- 站点级组件优先归入 `site/`
- 不新增 `any`
- 优先 `import type`
- 非必要不要加 `'use client'`
- `model/` 放状态、领域类型和交互 Hook，`lib/` 放处理逻辑，`ui/` 放组件、渲染器和图标映射；按职责拆分，不要求每个模块凑齐所有子目录
- 页面由 locale layout 提供唯一的 `<main>`，内部组件不重复添加主内容地标
- 读取密钥或只应在服务端执行的模块使用 `server-only` 标记；命令行也要使用的内容解析器保留在 `server/`，不引入客户端组件
- 不在 `src/` 里放 Markdown 文档

## 静态资源

| 路径 | 用途 | 维护方式 |
|------|------|------|
| `public/brand/mik/logo.svg` | Mik 品牌原稿，供页面和 SVG favicon 使用 | 修改原稿 |
| `public/brand/mik/icon-192.png`、`icon-512.png` | 安装图标；192px 图标同时用于聊天通知 | 从 Logo 导出对应尺寸 |
| `public/brand/mik/icon-maskable-1024.png` | 1024px 不透明自适应图标，供 Android 和 macOS 等平台裁切 | 保持文字在中心直径 80% 的圆形安全区内 |
| `public/brand/mik/favicon.ico` | 浏览器图标，包含 16/32/48px 图标 | 从 Logo 导出对应尺寸 |
| `public/brand/mik/apple-touch-icon.png` | 180px Apple Touch Icon | 从 Logo 导出对应尺寸 |
| `public/brand/encinet/logo.webp` | Encinet 团队 Logo | 修改原稿 |
| `public/images/home/`、`public/images/map/` | 按用途归档的页面图片 | 修改原图及引用 |
| `public/images/app/<locale>/desktop.png`、`mobile.png` | 安装预览截图，分别为 1440×900 和 390×844 | 从对应语言的真实首页截取 PNG |

修改 Mik Logo 时，同步导出并更新以上五个 ICO/PNG 文件，连同原稿一起提交。安装预览使用真实界面截图，桌面与手机截图分别标记为 `wide` 和 `narrow`，并提供对应语言的无障碍描述；首页外观变更时同步更新截图。

品牌资源的公开路径集中在 `src/shared/config/site-config.ts`，页面、manifest、结构化数据和通知共用这些配置。根 layout 的 Metadata API 声明应用名称、ICO、SVG 和 Apple 图标，语言 layout 链接对应的 manifest。`src/app/[locale]/manifest.webmanifest/route.ts` 在构建时生成两种语言的安装信息；装配逻辑和分享图片的渲染实现归入 `src/site/seo/`，`opengraph-image.tsx` 等路由入口保留在 `src/app/`。

两种语言的 manifest 共用 `id: '/'` 和 `scope: '/'`，应用名称统一为 `Mik Casual`；`start_url`、描述、快捷入口和截图随语言变化。快捷入口复用聊天、地图和 Wiki 的现有翻译，截图描述放在 `metadata.screenshots`。

## 聊天模块的职责边界

聊天实现保留在 `src/modules/chat/`，按下面的职责维护：

| 路径 | 职责 |
|------|------|
| `model/chat-*.ts` | 协议校验、会话目标、消息投递类型、未读与工作区规则 |
| `model/use-web-chat.ts` | 将会话事件衔接到 React 状态、本机历史与实时消息订阅 |
| `model/use-chat-workspace.ts` | 草稿、会话元信息与偏好设置的有序写入和跨标签页同步 |
| `lib/connection/chat-transport.ts` | WebSocket 加密、密钥确认与轮换 |
| `lib/connection/chat-authorization.ts` | 同源 HTTP 授权请求与响应解析 |
| `lib/connection/chat-session.ts` | 连接生命周期、授权续验、重连、当前身份与发送确认期限 |
| `lib/chat-history.ts` | IndexedDB 事务、账号与存储代次隔离、历史清理与同步通知 |
| `ui/` | 组件、界面交互与呈现，不直接创建连接或发起聊天授权 |

连接层不依赖 React、组件或 IndexedDB；异步授权结果须在完整读取响应后检查连接代次，延迟通知须重新检查原消息的当前阅读权限。停止会话时统一取消授权、重连、连接超时及发送确认计时器。

消息、未读位置和工作区共用账号与存储代次检查，保持在同一事务边界内。新增聊天数据类型放在 `model/`，界面通过该模型和状态 Hook 使用数据，不从界面组件或 Hook 的实现文件反向导出领域类型。

## 清理规则

- 删除功能时同步移除路由、组件、样式入口、导航、翻译和静态资源，不保留注释掉的旧实现
- 删除资源前检查源码、样式和内容引用；Next.js 的约定文件也是入口，不能只按 import 判断是否有用
- 改动路由、模块边界或构建配置后运行 `bun check` 和 `bun run build`

## 多语言

- 涉及界面文案时，同时更新 `messages/zh-CN.json` 与 `messages/en.json`
- 已在内容文件里定义的标题、描述、图标、分组，不要在代码里重复硬编码
- 按语义归属组织键：`common` 放跨业务的操作和状态，业务名称、字段、枚举和提示归入对应模块。`buildings.types` 同时供建筑收录与投稿使用；不增加没有独立职责的 `shared` 层级。
- 模块的 `title` 是页面名称，可供导航、页面标题和 metadata 复用；SEO 专用文案放进 `meta`。短导航名称或不同语境的提示可以独立保留，不能仅因文字相同就合并。
- 组件优先使用模块命名空间。Header、Footer、账号导航等组合组件可以使用根翻译器读取各模块名称；业务页面不依赖导航控件或另一个页面的区块键。
- 同一个业务枚举使用同一套标签。普通键使用 camelCase；直接对应外部协议的错误码可以保留 snake_case。错误码与展示文案的映射归入对应业务模块。
- `zh-CN.json` 是 `next-intl` 翻译键的类型基准。静态键由 TypeScript 检查；动态外部键经 `hasTranslationKey` 检查后再使用，并提供兜底提示。组件不读取原始字典来判断翻译是否存在。
- 新增、移动或删除键时同步更新两种语言及调用方，运行 `bun check:i18n`。该检查使用 ICU 解析器验证语法、键集合、变量类型和富文本标签，允许不同语言使用不同复数分支。

## Commit 规范

提交信息格式：

```text
<type>(<scope>): <summary>
```

规则：

- `type` 使用小写
- `scope` 使用 `kebab-case`，可选
- `summary` 用祈使句，简短明确，不加句号
- 一次提交尽量只做一类事情，不要把重构、文案、功能修复混在一起

常用 `type`：

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复问题 |
| `refactor` | 重构，不改变外部行为 |
| `docs` | 文档修改 |
| `style` | 纯格式或样式整理，不改逻辑 |
| `test` | 测试相关 |
| `chore` | 杂项维护 |
| `build` | 构建、脚本、依赖调整 |

常用 `scope`：

- `app`
- `modules`
- `site`
- `shared`
- `wiki`
- `i18n`
- `api`
- `mcp`
- `docs`

示例：

```text
feat(wiki): add search result grouping
fix(api): handle empty announcements response
refactor(site): simplify site header structure
docs(contributing): clarify commit format
chore(i18n): align locale message keys
```

## Branch / PR 规范

### Branch 命名

推荐格式：

```text
<type>/<scope>-<summary>
```

示例：

```text
feat/wiki-search
fix/api-timeout
refactor/home-live-overview
docs/contributing-rules
```

规则：

- 不要直接在 `main` 上开发、提交或发起变更
- 使用小写
- 使用 `kebab-case`
- 保持简短，不要把多个不相关目标塞进一个分支名

### PR 标题

推荐直接沿用 commit 主格式：

```text
<type>(<scope>): <summary>
```

示例：

```text
feat(wiki): add grouped search results
fix(api): handle empty ban response
refactor(site): simplify site header structure
docs(readme): trim setup instructions
```

规则：

- 标题要能单独说明这次改动做了什么
- 不要使用模糊标题，如 `update`、`fix stuff`、`adjust files`
- 不要把多个不相关改动合并进一个 PR 标题

### PR 拆分

- 一个 PR 只解决一类问题
- 重构、功能、文档、内容修正尽量不要混在同一个 PR
- 如果改动同时包含结构迁移和行为变更，优先拆成两个 PR
- PR 描述使用仓库内的 `.github/pull_request_template.md`

## Wiki / 内容编辑

目录固定为 `content/<locale>/<group>/*.md`。每个分组目录必须包含 `_group.md`，文件名本身就是 `section id`，中英文必须使用相同文件名。

目录示例：

```text
content/
  zh-CN/
    basics/
      _group.md
      getting-started.md
```

组级元信息：

```yaml
---
label: 入服准备
order: 10
---
```

文章元信息：

```yaml
---
title: 新手入门
description: 从申请加入到首次进入服务器的基础说明。
order: 10
icon: Home
---
```

| 字段 | 说明 | 约束 |
|------|------|------|
| `label` | 分组显示名 | 写在 `_group.md` |
| `order` | 分组或文章排序 | 同层级内唯一 |
| `title` | 页面标题 | 正文不要重复写 `# 一级标题` |
| `description` | 导航摘要 | 保持简短 |
| `icon` | 导航图标 | 当前支持 `Home` `Wrench` `Shield` `Users` `Zap` |

规则：

- 每篇文章至少包含一个 `##`
- 同名中英文文件的目录分组、`order`、`icon` 必须一致
- 不要新增多级子目录
- 不要只改单语文件名或只增删单语文件

常见报错：

| 报错 | 含义 |
|------|------|
| `Invalid wiki section front matter in ...` | 文章元信息缺字段、类型错误或 `icon` 非法 |
| `Invalid wiki group front matter in ...` | `_group.md` 缺少 `label` 或 `order` |
| `Missing _group.md in wiki group ...` | 分组目录缺少组级元信息文件 |
| `Wiki body must not contain an extra level-1 heading` | 正文里重复写了 `# 标题` |
| `Wiki section must contain at least one level-2 heading` | 缺少 `##` 小节 |
| `Duplicate wiki section order` | 同一语言内文章排序冲突 |
| `Cross-locale wiki metadata mismatch` | 中英文目录分组、排序或图标未对齐 |
| `Wiki locale parity mismatch` | 某个 section 没有双语配对 |

## API / MCP

- 数据 API 由独立的 `mikdata` Worker 提供；MikWeb 内不要重新引入 Minecraft 上游代理或 TOTP secret
- MCP 工具变更后，同步更新 [README.md](./README.md) 中的对外说明
- 涉及数据 API 响应结构、缓存行为或新增端点时，在 `mikdata` 项目维护对应文档

## 文档维护

- `README.md` 保留项目入口、运行方式、项目路由和 MCP 接入信息
- `CONTRIBUTING.md` 维护协作流程、内容规范、目录约定和提交规则
- 修改检查命令、Wiki 元信息结构或接口说明时，相关文档必须一起更新
