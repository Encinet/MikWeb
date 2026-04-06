# Contributing

协作流程、内容规范和维护边界统一放在这里。项目简介、运行方式、API 路由和 MCP 接入信息见 [README.md](./README.md)。

## 初始化

```bash
bun install
cp .env.example .env
```

## 检查命令

| 命令 | 用途 |
|------|------|
| `bun fix` | 自动修正 Biome 可处理的问题 |
| `bun check:wiki` | 校验 Wiki 元信息、分组目录、排序、章节结构和双语配对 |
| `bun check` | 执行代码检查、类型检查和 Wiki 校验 |

## 角色入口

| 角色 | 主要路径 | 提交前至少执行 |
|------|------|------|
| Wiki / 内容编辑 | `content/<locale>/<group>/` | `bun check:wiki` |
| 前端开发 | `app/` `components/` `contexts/` `lib/` | `bun check` |
| API / MCP 维护 | `app/api/` `lib/proxyRoute.ts` `app/api/mcp/route.ts` | `bun check` |
| 文档 / 翻译维护 | `README.md` `CONTRIBUTING.md` `messages/` `content/<locale>/<group>/` | 按改动范围执行 |

## 目录

| 区域 | 路径 | 说明 |
|------|------|------|
| 页面与路由 | `app/[locale]/` | 官网页面、Wiki 页面、多语言路由 |
| API | `app/api/` | 代理接口与 MCP 端点 |
| Wiki 内容 | `content/<locale>/<group>/` | 分组后的 Markdown 源文件 |
| 翻译文案 | `messages/` | `next-intl` 文案 |
| 共享逻辑 | `lib/` | 数据处理、代理、Wiki 解析、metadata |

## Wiki / 内容编辑

目录固定为 `content/<locale>/<group>/*.md`。每个分组目录必须包含 `_group.md`，文件名本身就是 `section id`，中英文必须使用相同文件名。

目录示例：

```text
content/
  zh-CN/
    basics/
      _group.md
      getting-started.md
    gameplay/
      _group.md
      commands.md
```

组级元信息写在 `_group.md`：

```yaml
---
label: 入服准备
order: 10
---
```

文章元信息写在 Markdown 首部：

```yaml
---
title: 新手入门
description: 从申请加入、版本支持到首次进入服务器，先把基础信息看完。
order: 10
icon: Home
---
```

| 字段 | 说明 | 约束 |
|------|------|------|
| `label` | 分组显示名 | 写在 `_group.md` |
| `order` | 分组或文章排序 | 同层级内唯一，分组写在 `_group.md`，文章写在正文文件 |
| `title` | 页面标题 | 正文不要重复写 `# 一级标题` |
| `description` | 导航摘要 | 保持简短 |
| `icon` | 导航图标 | 当前支持 `Home` `Wrench` `Shield` `Users` `Zap` |

编辑规则：

- 每篇文章至少包含一个 `##` 二级标题。
- 同名中英文文件的目录分组、`order`、`icon` 必须一致。
- 不要新增多级子目录。
- 不要只改单语文件名或只增删单语文件。

常见报错：

| 报错 | 含义 |
|------|------|
| `Invalid wiki section front matter in ...` | 文章元信息缺字段、类型错误或 `icon` 非法 |
| `Invalid wiki group front matter in ...` | `_group.md` 缺少 `label` 或 `order` |
| `Missing _group.md in wiki group ...` | 分组目录缺少组级元信息文件 |
| `Wiki body must not contain an extra level-1 heading` | 正文里重复写了 `# 标题` |
| `Wiki section must contain at least one level-2 heading` | 缺少 `##` 小节 |
| `Duplicate wiki section order` | 同一语言内文章 `order` 冲突 |
| `Cross-locale wiki metadata mismatch` | 中英文目录分组、排序或图标未对齐 |
| `Wiki locale parity mismatch` | 某个 section 没有双语配对 |

## 前端开发

- 优先复用现有页面结构、组件职责和共享逻辑。
- 涉及多语言界面文案时，同时更新 `messages/zh-CN.json` 与 `messages/en.json`。
- 已在 Markdown 元信息中定义的标题、描述、图标、分组，不要再在代码里硬编码。
- 变量命名保持语义化，避免 `data`、`list`、`item2`、`tmp`。

推荐命名：

- `wikiDocuments`
- `wikiSections`
- `wikiGroups`
- `wikiContentBySection`
- `wikiOutlineBySection`

## API / MCP 维护

- `/api/*` 的代理行为优先复用 `lib/proxyRoute.ts`。
- MCP 工具变更后，同步更新 [README.md](./README.md) 中的对外说明。
- 涉及响应结构、缓存行为或新增端点时，同步更新 README。
- 路由与工具清单以 [README.md](./README.md) 为准。

## 文档 / 翻译维护

- `README.md` 只保留项目入口、运行方式、API 路由和 MCP 接入信息。
- `CONTRIBUTING.md` 维护协作流程、内容规范、目录约定和多语言规则。
- 修改构建流程、检查命令、Wiki 元信息结构或接口说明时，相关文档必须一起更新。

新增语言时，需要同时补齐：

1. `i18n/routing.ts` 中的 locale 配置。
2. `messages/<locale>.json`。
3. `content/<locale>/<group>/` 下对应的分组目录与 Markdown 文件。
