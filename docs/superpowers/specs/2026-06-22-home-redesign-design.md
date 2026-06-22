# MikWeb 首页视觉重构设计

日期：2026-06-22

## 背景

MikWeb 当前首页信息结构清晰，但首屏视觉冲击力不足，主题配色偏旧。此次重构目标是在保留现有文案和业务逻辑的前提下，让首页开屏更有沉浸感、品牌感和艺术海报感。

用户指定新的核心配色：

- `#F6B4A6`：珊瑚粉，作为主强调色
- `#70ACC2`：湖蓝，作为空间光和冷色辅助
- `#DC8C6B`：陶土橙，作为暖色辅助

经过视觉探索，确定右侧主视觉不使用 Minecraft 图标或复杂图形，而使用 `MIK` 三个字母作为巨大艺术字主视觉。

## 目标

1. 首页首屏更震撼，具备明确品牌视觉中心。
2. 保留现有首页文案和 i18n key，不改文案语义。
3. 将“创造休闲体验”和“精选玩家社区”移动到开屏下方。
4. 用新配色替换当前金黄色主视觉。
5. 保持沉浸感，但不引入重型图形、外部图片或外部字体 CDN。
6. 保持响应式体验和可访问性。

## 范围

### 会修改

- `src/modules/home/ui/home-page.tsx`
- `src/app/globals.css`
- `src/site/background/ui/site-background.tsx`

根据实现需要，可能轻微调整首页相关 class 或现有通用 surface/button token。

### 不会修改

- API 路由
- MCP 逻辑
- Wiki 内容
- 建筑页业务逻辑
- 封禁页业务逻辑
- 国际化文案语义
- 路由结构
- 数据获取逻辑

## 首页结构设计

首页保留现有内容，但重排视觉层级。

### Hero 开屏

首页 hero 从单列居中改成左右分栏。

左侧保留现有内容和 i18n key：

- `home.hero.badge`
- `home.hero.title`
- `home.hero.description`
- `home.hero.joinButton`
- `home.hero.notice`

右侧新增品牌视觉：

- 巨大的 `MIK` 字母艺术字
- 高对比衬线字体方向
- `#F6B4A6` 实心主字
- `#70ACC2` 描边/残影层
- 轻微倾斜、压缩字距、右侧裁切，形成海报感

### Feature 区位置

现有两个 feature：

- `home.features.creativeFreedom`
- `home.features.curatedCommunity`

从页面底部移动到 hero 下方，作为开屏延展区。

首页顺序从：

```text
Hero
实时数据 / 公告
Feature cards
```

调整为：

```text
Hero
Feature cards
实时数据 / 公告
```

## MIK 字母视觉设计

右侧主视觉使用 `MIK` 三个字母本身，不使用外部图形素材。

### 字体策略

第一版使用系统衬线 fallback：

```css
font-family: Georgia, "Times New Roman", serif;
```

暂不引入外部字体 CDN，避免加载不稳定和授权风险。未来如果需要更强艺术感，可引入确认授权的本地字体文件。

### 分层策略

`MIK` 由两层组成：

1. 实心层
   - 大号 `MIK`
   - 颜色 `#F6B4A6`
   - 带柔和发光和阴影

2. 描边残影层
   - 同样的 `MIK`
   - 使用 `#70ACC2`
   - 位置略微错开
   - 用于制造空间感和艺术残影

桌面端 `MIK` 可略微溢出右侧边缘，形成海报裁切感。

## 主题色设计

沿用现有 CSS token 体系，不做大规模变量重命名。

### 深色主题

深色主题作为主要沉浸风格。

建议方向：

```css
--theme-bg-base: #071015;
--theme-bg-gradient-from: #071015;
--theme-bg-gradient-to: #261615;

--brand-gold: #f6b4a6;
--brand-gold-hover: #dc8c6b;

--theme-accent-blue: #70acc2;
--theme-accent-blue-strong: #9ed2e4;
--theme-accent-amber: #f6b4a6;
--theme-accent-amber-strong: #ffd0c5;
--theme-accent-red: #dc8c6b;
```

虽然部分变量名仍包含 `gold` / `amber`，第一版保留命名以降低改动范围，只替换实际颜色。

### 浅色主题

浅色主题同步调整为奶油白、珊瑚和湖蓝方向，避免继续使用旧金棕调。

要求：

- 可读性优先
- 背景不要过粉
- 按钮使用 `#F6B4A6`
- hover 使用 `#DC8C6B`
- 信息强调使用 `#70ACC2`

## 背景光效

`SiteBackground` 当前的三个光点为 gold、green、purple。重构后改为：

- coral：对应 `#F6B4A6`
- aqua：对应 `#70ACC2`
- clay：对应 `#DC8C6B`

保留现有旋转背景机制和性能优化，不引入 Canvas 或 WebGL。

## 动效设计

### 入场动效

首页开屏使用轻量入场动效：

- 左侧文案淡入并轻微上移
- 加入按钮稍微延迟出现
- 右侧 `MIK` 缓慢淡入并轻微位移
- 下方 feature 卡片依次出现

动效目标是沉浸和高级，不做闪烁、旋转或高频动画。

### Reduced motion

所有新增动效需要遵守 `prefers-reduced-motion: reduce`。

当用户开启减少动画时：

- 不播放入场动画
- 不播放 hover 位移动画
- 保留静态布局和可读内容

## 响应式设计

### 桌面端

使用左右分栏：

```text
左侧文案  |  右侧 MIK 字母视觉
```

右侧 `MIK` 可大幅显示，并允许局部裁切。

### 平板端

保留左右关系，但右侧视觉缩小并更接近背景装饰。不能挤压左侧文案和 CTA。

### 手机端

内容优先：

- `MIK` 降低透明度，作为 hero 背景层
- 文案保持可读
- 按钮可接近全宽
- feature cards 单列排列

## 验收标准

1. 首页首屏打开后能明显看到品牌视觉中心。
2. 右侧 `MIK` 具备艺术海报感，而不是普通文本。
3. 首页仍使用现有 i18n key 和文案语义。
4. “创造休闲体验”和“精选玩家社区”位于 hero 下方。
5. 旧金黄色不再作为主要视觉色。
6. 新配色在按钮、背景光、卡片、hover、滚动条等关键位置生效。
7. 桌面、平板、手机布局不溢出，内容优先级清晰。
8. 不引入外部字体 CDN、图片素材、Canvas、WebGL 或大型新依赖。
9. `prefers-reduced-motion` 下页面仍可正常阅读和操作。
10. 项目检查命令通过。

## 验证方式

实现后运行：

```bash
bun check
```

如果当前环境仍提示 `bun: command not found`，需要先修复 Bun 安装或 PATH，再执行项目官方检查命令。
