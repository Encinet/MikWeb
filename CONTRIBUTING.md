# Contributing

本地运行与配置见 [README.md](./README.md)。

## 代码组织

| 路径 | 职责 |
|------|------|
| `src/app/` | 路由、布局、metadata 和 HTTP 入口 |
| `src/modules/` | 业务功能；按需划分 `model`、`lib`、`server`、`ui` |
| `src/site/` | Header、Footer、主题与 SEO 等站点能力 |
| `src/shared/` | 通用 API、配置、UI 和多语言基础能力 |

依赖方向为 `app → modules/site/shared`、`site → modules/shared`、`modules → shared`。模块之间可复用公开能力，避免循环依赖。跨层引用使用 `@/`。

- 路由负责装配，业务逻辑放在对应模块；读取密钥的模块使用 `server-only`。
- 文件与目录使用 `kebab-case`，组件和类型使用 `PascalCase`，函数与变量使用 `camelCase`。
- 聊天连接和存储通过状态 Hook 衔接，UI 不直接创建连接或操作数据库。
- 登录状态由 `AuthProvider` 统一管理；`verified` 表示服务端已经确认身份，`isLoading` 也可能只是后台刷新。刷新时保留已验证的内容，退出、降权和切换账号时清理私有内容。导航可使用有期限的显示标记提前恢复入口，但该标记只保存时间戳，不恢复账号或授予权限。
- 删除功能时同步清理路由、样式、翻译和资源引用；注意 Next.js 约定文件也是入口。

## 多语言与资源

界面文案同时更新 `messages/zh-CN.json` 和 `messages/en.json`，翻译键归入对应业务命名空间。新增、移动或删除键时同步修改调用方；动态外部键通过 `hasTranslationKey` 检查后使用。

站点品牌由 `src/shared/config/site-config.ts` 定义：正式站名使用 `SITE_NAME`，紧凑的导航标识使用 `SITE_SHORT_NAME`，运营团队使用 `ORGANIZATION_NAME`。品牌名不随语言变化。翻译需要品牌名时使用 `{siteName}` 或 `{organizationName}`，调用时传入 `SITE_TRANSLATION_VALUES`；不要在组件中另建按语言划分的文案表。

完整服务器介绍复用 `metadata.description`，简短定位复用 `nav.brand.subtitle`，分享卡的标题和短介绍使用 `metadata.social`。页面标题不再手写品牌前后缀，由布局统一添加站名。Wiki 正文中的首次介绍使用正式站名；插件和仓库名称按项目实际名称保留。

游戏连接地址使用 `MINECRAFT_SERVER_ADDRESS`，网页域名由 `SITE_URL` 派生。API 与聊天服务端点位于 `src/shared/config/service-config.ts`，连接代码和 CSP 引用同一配置。语言范围与语言名称由 `src/shared/i18n/routing.ts` 维护，Wiki 复用站点语言范围。建筑类型的显示名称复用 `buildings.types`。

品牌资源位于 `public/brand/`，页面图片位于 `public/images/`，公共路径集中在 `src/shared/config/site-config.ts`。修改 Logo 时同步更新派生图标，更新字体时保留许可证。

## Wiki 编辑

文章位于 `content/<locale>/<group>/*.mdx`。每个分组包含 `_group.mdx`，填写 `label` 和 `order`；文章元信息示例：

```yaml
---
title: 新手入门
description: 从加入社区到首次进入服务器的说明。
order: 10
icon: Home
---
```

- 中英文使用相同目录和文件名，分组、排序、图标与访问范围保持一致，同层级排序不重复。
- 正文从 `##` 开始，至少包含一个二级标题；不要重复一级标题。
- 管理分组保留 `access: staff`，仅在服务端验证管理身份后加载，不进入公开内容和搜索结果。
- MDX 仅使用仓库内经过评审的内容；组件用法参考[现有文档](./content/zh-CN/)。

## 验证

代码改动运行：

```bash
bun check
bun test
```

仅修改 Wiki 可运行 `bun check:wiki`，仅修改翻译可运行 `bun check:i18n`。路由、依赖或构建配置变更后补充 `bun run build`；界面变更检查实际页面和键盘操作。纯文档修改核对命令与链接即可。

测试优先覆盖权限、数据完整性与关键状态变化，避免重复验证类型检查已保证的内容或简单展示细节。

## 提交

使用独立分支，一个 PR 聚焦一个问题。Commit 和 PR 标题采用 `<type>(<scope>): <summary>`，例如 `fix(auth): handle expired sessions`，其中 scope 可省略。

PR 描述使用[仓库模板](./.github/pull_request_template.md)，说明改动与验证结果；界面改动附必要截图。
