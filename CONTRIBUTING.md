# Contributing

协作规则、内容规范和维护边界统一放在这里。项目简介、运行方式、环境变量、API 路由和 MCP 接入信息见 [README.md](./README.md)。

## 开始

```bash
bun install
cp .env.example .env
```

## 检查

| 命令 | 用途 |
|------|------|
| `bun fix` | 自动修正 Biome 可处理的问题 |
| `bun check:wiki` | 校验 Wiki 元信息、分组目录、排序、章节结构和双语配对 |
| `bun check` | 执行代码检查、类型检查和 Wiki 校验 |

提交前至少执行与改动范围对应的检查；不确定时直接运行：

```bash
bun check
```

## 协作入口

| 类型 | 主要路径 | 提交前至少执行 |
|------|------|------|
| Wiki / 内容编辑 | `content/<locale>/<group>/` | `bun check:wiki` |
| 前端开发 | `src/app/` `src/modules/` `src/site/` `src/shared/` | `bun check` |
| API / MCP 维护 | `src/app/api/` `src/shared/api/proxy-route.ts` `src/app/api/mcp/route.ts` | `bun check` |
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

如果一个模块需要反向依赖更高层，通常说明它放错层了。

## 命名

- 文件名统一使用 `kebab-case`
- 目录名统一使用 `kebab-case`
- React 组件、Provider、类型名使用 `PascalCase`
- 函数、变量使用 `camelCase`
- 避免新增 `utils.ts`、`helpers.ts`、`common.ts`、`model.ts` 这类泛名文件
- 文件名应直接体现职责，例如 `player-history-panel.tsx`、`building-types.ts`

## 代码规则

- 优先复用现有页面结构、组件职责和共享逻辑
- 路由层只做页面入口与装配，不堆业务细节
- 业务代码优先归入对应 `modules/<slice>/`
- 站点级组件优先归入 `site/`
- 不新增 `any`
- 优先 `import type`
- 非必要不要加 `'use client'`
- 不在 `src/` 里放 Markdown 文档

## 多语言

- 涉及界面文案时，同时更新 `messages/zh-CN.json` 与 `messages/en.json`
- 已在内容文件里定义的标题、描述、图标、分组，不要在代码里重复硬编码

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

- `/api/*` 的代理行为优先复用 `src/shared/api/proxy-route.ts`
- MCP 工具变更后，同步更新 [README.md](./README.md) 中的对外说明
- 涉及响应结构、缓存行为或新增端点时，同步更新 README

## 文档维护

- `README.md` 保留项目入口、运行方式、API 路由和 MCP 接入信息
- `CONTRIBUTING.md` 维护协作流程、内容规范、目录约定和提交规则
- 修改检查命令、Wiki 元信息结构或接口说明时，相关文档必须一起更新
