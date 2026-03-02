# 常用指令

以下是服务器中常用的指令列表，点击原版指令名称可跳转至 Minecraft Wiki 查看详细用法。

## 原版指令

服务器支持以下原版指令，点击可查看详细文档：

| 指令 | 说明 |
|------|------|
| [`/attribute`](https://zh.minecraft.wiki/w/命令/attribute) | 查询或修改实体的属性值 |
| [`/clear`](https://zh.minecraft.wiki/w/命令/clear) | 清除玩家背包中的物品 |
| [`/damage`](https://zh.minecraft.wiki/w/命令/damage) | 对实体造成指定类型与数值的伤害 |
| [`/effect`](https://zh.minecraft.wiki/w/命令/effect) | 为实体添加或清除状态效果 |
| [`/enchant`](https://zh.minecraft.wiki/w/命令/enchant) | 为玩家手持物品附魔 |
| [`/fill`](https://zh.minecraft.wiki/w/命令/fill) | 用指定方块填充区域 |
| [`/gamemode`](https://zh.minecraft.wiki/w/命令/gamemode) | 切换玩家游戏模式 |
| [`/give`](https://zh.minecraft.wiki/w/命令/give) | 给予玩家指定物品 |
| [`/item`](https://zh.minecraft.wiki/w/命令/item) | 修改容器或实体装备栏中的物品 |
| [`/ride`](https://zh.minecraft.wiki/w/命令/ride) | 控制实体的骑乘关系 |
| [`/save-all`](https://zh.minecraft.wiki/w/命令/save) | 立即保存服务器世界数据 |
| [`/seed`](https://zh.minecraft.wiki/w/命令/seed) | 显示当前世界的种子 |
| [`/setblock`](https://zh.minecraft.wiki/w/命令/setblock) | 在指定位置放置方块 |
| [`/tp`](https://zh.minecraft.wiki/w/命令/tp) | 传送实体到指定位置或其他实体处 |
| [`/tellraw`](https://zh.minecraft.wiki/w/命令/tellraw) | 向玩家发送格式化的 JSON 文本消息 |
| [`/time`](https://zh.minecraft.wiki/w/命令/time) | 查询或修改世界时间 |
| [`/weather`](https://zh.minecraft.wiki/w/命令/weather) | 切换世界天气 |

## 传送与位置

| 指令 | 说明 |
|------|------|
| `/spawn` | 回到主城 |
| [`/tp`](https://zh.minecraft.wiki/w/命令/tp) | 传送到指定坐标或玩家位置 |
| `/sethome` | 将当前位置设置为家 |
| `/home` | 传送回已设置的家 |
| `/delhome` | 删除已设置的家 |
| `/homelist` | 查看所有已设置的家 |
| `/back` | 返回上一次所在的位置（如死亡点、传送前位置） |

## 建筑与创作

### Axiom

**Axiom** 是一款功能强大的一体化 Minecraft 世界编辑模组，支持实时地形雕刻、建筑辅助、笔刷工具等专业功能。

- [Modrinth 模组页面](https://modrinth.com/mod/axiom) — 下载模组本体
- [服务器 Axiom 使用教程](https://hi-ysumc.feishu.cn/wiki/QDJBwtCBEi5eLakfWCvcRtErnvb) — 本服专属使用指南

> **快捷键提示：**
> - 在创造模式下按住 `左 Alt` 打开 Builder 菜单
> - 按 `右 Shift` 进入 Editor 模式（地形编辑、笔刷工具等）

### 创世神（WorldEdit）

**WorldEdit** 是经典的建筑辅助插件，适合快速复制、粘贴、旋转建筑结构，以及大范围地形调整。配合 Axiom 使用效果更佳。

服务器已内置 WorldEdit，无需自行安装插件本体即可直接使用。

- [常用命令一览(中文)](https://www.mcmod.cn/post/3050.html)
- [完整命令收录(中文)](https://www.mcmod.cn/post/3533.html)
- [官方命令列表(英文)](https://intellectualsites.gitbook.io/fastasyncworldedit/features/main-commands-and-permissions)


## 装饰与互动

| 指令 | 说明 |
|------|------|
| `/headdb` | 打开装饰头颅数据库，获取各类装饰用头颅 |
| `/hat` | 将手中持有的物品戴到头上 |
| `/asedit give` | 获取盔甲架编辑器 |
| `/sit` | 坐下（在方块上） |
| `/lay` | 躺下 |
| `/crawl` | 爬行 |
| `/trash` | 打开垃圾桶界面，放入其中的物品将被永久销毁 |

## 物品与世界管理

| 指令 | 说明 |
|------|------|
| `/rmitems [半径]` | 清理周围的掉落物，默认清理半径为 50 格。可手动指定半径，例如 `/rmitems 20` 仅清理 20 格内的掉落物 |

> 黄名玩家无法使用 `/rmitems`。

## 音乐与娱乐

| 指令 | 说明 |
|------|------|
| `/music` | 打开音乐控制台，播放/控制背景音乐（需要安装 [PlasmoVoice](https://modrinth.com/plugin/plasmo-voice) 模组） |
| `/firework gun` | 获取一把随机烟花发射器 |

## PVP 控制

| 指令 | 说明 |
|------|------|
| `/pvp` | 手动开启或关闭 PVP 状态（服务器默认禁止 PVP） |

> PVP 默认处于关闭状态，请在双方同意的前提下开启。

## 小游戏

| 指令 | 说明 |
|------|------|
| `/apk start` | 开始跑酷挑战（难度随进度递增） |
| `/spy` | 进入「谁是杀手」小游戏 |