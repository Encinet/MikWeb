---
title: 常用指令
description: 日常服务器中传送、建筑、装饰和娱乐指令
order: 20
icon: Wrench
---

本页整理普通玩家会用到的指令。新玩家默认为黄名身份，考察通过后会成为白名正式成员；管理员命令不在本页列出。

需要查询原版命令完整语法时，请直接查看文末的「原版指令参考」。

## 传送与位置

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td>主城</td><td><code>/spawn</code></td><td>回到主城</td></tr>
<tr><td>原版传送</td><td><a href="https://zh.minecraft.wiki/w/命令/tp"><code>/tp</code></a></td><td>传送到指定坐标或玩家位置</td></tr>
<tr><td rowspan="3">家</td><td><code>/sethome &lt;名字&gt;</code></td><td>把当前位置保存为一个家</td></tr>
<tr><td><code>/home &lt;名字&gt;</code></td><td>回到指定的家；不带名字时会显示已有家和用法</td></tr>
<tr><td><code>/delhome &lt;名字&gt;</code></td><td>删除指定的家；新成员最多 2 个家，正式成员最多 20 个家</td></tr>
<tr><td rowspan="3">返回历史位置</td><td><code>/back</code></td><td>返回上一次传送或死亡前的位置</td></tr>
<tr><td><code>/back [次数]</code></td><td>一次回退多条历史记录</td></tr>
<tr><td><code>/back undo</code> 或 <code>/reback</code></td><td>撤销上一次返回，回到刚才的位置</td></tr>
</tbody>
</table>

## 状态与服务器信息

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">挂机状态</td><td><code>/afk</code></td><td>切换挂机状态</td></tr>
<tr><td><code>/afk &lt;状态&gt;</code></td><td>进入挂机并把自定义状态显示在头顶，最多 12 个字</td></tr>
<tr><td>公告</td><td><code>/announcements</code></td><td>打开服务器公告菜单</td></tr>
<tr><td>小提示</td><td><code>/tip</code></td><td>查看一条服务器小提示</td></tr>
</tbody>
</table>

## 建筑与创作

### Axiom

**Axiom** 是一款功能强大的一体化 Minecraft 世界编辑模组，支持实时地形雕刻、建筑辅助、笔刷工具等专业功能。

- [Modrinth 模组页面](https://modrinth.com/mod/axiom) — 下载模组本体
- [服务器 Axiom 使用教程](https://hi-ysumc.feishu.cn/wiki/QDJBwtCBEi5eLakfWCvcRtErnvb) — 本服专属使用指南

> **快捷键提示：**
>
> - 在创造模式下按住 `左 Alt` 打开 Builder 菜单
> - 按 `右 Shift` 进入 Editor 模式（地形编辑、笔刷工具等）

### 创世神（WorldEdit）

**WorldEdit** 是经典的建筑辅助插件，适合快速复制、粘贴、旋转建筑结构，以及大范围地形调整。配合 Axiom 使用效果更佳。

服务器已内置 WorldEdit 插件，玩家无需在客户端安装相关 Mod，加入服务器后即可直接使用。

- [常用命令一览(中文)](https://www.mcmod.cn/post/3050.html)
- [完整命令收录(中文)](https://www.mcmod.cn/post/3533.html)
- [官方命令列表(英文)](https://intellectualsites.gitbook.io/fastasyncworldedit/features/main-commands-and-permissions)

## 装饰与互动

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td>装饰头颅</td><td><code>/headdb</code></td><td>打开装饰头颅数据库，获取各类装饰用头颅</td></tr>
<tr><td>帽子</td><td><code>/hat</code></td><td>将手中持有的物品戴到头上</td></tr>
<tr><td rowspan="4">名称标签</td><td><code>/nametag</code></td><td>查看当前自定义前缀和后缀</td></tr>
<tr><td><code>/nametag prefix set &lt;内容&gt;</code></td><td>设置名称前缀，需要正式成员权限</td></tr>
<tr><td><code>/nametag suffix set &lt;内容&gt;</code></td><td>设置名称后缀，需要正式成员权限</td></tr>
<tr><td><code>/nametag clear</code></td><td>清除自定义前缀和后缀</td></tr>
<tr><td>盔甲架</td><td><code>/asedit give</code></td><td>获取盔甲架编辑器</td></tr>
<tr><td rowspan="2">隐形展示框</td><td><code>/imageframe giveinvisibleframe glowing</code></td><td>获取发光隐形展示框</td></tr>
<tr><td><code>/imageframe giveinvisibleframe regular</code></td><td>获取普通隐形展示框</td></tr>
<tr><td rowspan="3">姿势动作</td><td><code>/sit</code></td><td>坐下</td></tr>
<tr><td><code>/lay</code></td><td>躺下</td></tr>
<tr><td><code>/crawl</code></td><td>爬行</td></tr>
<tr><td>垃圾桶</td><td><code>/trash</code></td><td>打开垃圾桶界面，放入其中的物品将被永久销毁</td></tr>
</tbody>
</table>

## 物品与世界管理

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">清理掉落物</td><td><code>/rmitems</code></td><td>按默认 50 格半径清理周围掉落物</td></tr>
<tr><td><code>/rmitems &lt;半径&gt;</code></td><td>按指定半径清理掉落物，例如 <code>/rmitems 20</code></td></tr>
<tr><td>临时白名单</td><td><code>/tempwhitelist &lt;玩家名&gt;</code></td><td>为朋友添加 1 小时临时白名单，需要正式成员权限</td></tr>
</tbody>
</table>

> 黄名玩家（新成员默认身份）无法使用 `/rmitems` 和 `/tempwhitelist`。

## 音乐与娱乐

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td rowspan="5">音乐</td><td><code>/music</code></td><td>打开音乐控制台，需要安装 <a href="https://modrinth.com/plugin/plasmo-voice">PlasmoVoice</a> 模组</td></tr>
<tr><td><code>/music search &lt;关键词&gt;</code></td><td>搜索歌曲</td></tr>
<tr><td><code>/music page &lt;页码&gt;</code></td><td>切换音乐列表页码</td></tr>
<tr><td><code>/music random</code></td><td>获得一张随机唱片</td></tr>
<tr><td><code>/music randomplay</code></td><td>在最近的唱片机播放随机音乐</td></tr>
<tr><td>烟花</td><td><code>/firework gun</code></td><td>获取一把随机烟花发射器</td></tr>
</tbody>
</table>

## PVP 控制

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td>PVP 状态</td><td><code>/pvp</code></td><td>手动开启或关闭 PVP 状态，服务器默认禁止 PVP</td></tr>
</tbody>
</table>

> PVP 默认处于关闭状态，请在双方同意的前提下开启。

## 小游戏

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td>跑酷</td><td><code>/apk start</code></td><td>开始跑酷挑战，难度随进度递增</td></tr>
<tr><td>谁是杀手</td><td><code>/spy</code></td><td>进入「谁是杀手」小游戏</td></tr>
</tbody>
</table>

## 原版指令参考

服务器支持以下原版指令，点击命令名可跳转至 Minecraft Wiki 查看完整语法与详细说明：

| 指令 | 说明 | 需要正式成员 |
|------|------|:----------:|
| [`/attribute`](https://zh.minecraft.wiki/w/命令/attribute) | 查询或修改实体的属性值 | ✔ |
| [`/clear`](https://zh.minecraft.wiki/w/命令/clear) | 清除玩家背包中的物品 | |
| [`/damage`](https://zh.minecraft.wiki/w/命令/damage) | 对实体造成指定类型与数值的伤害 | ✔ |
| [`/effect`](https://zh.minecraft.wiki/w/命令/effect) | 为实体添加或清除状态效果 | ✔ |
| [`/enchant`](https://zh.minecraft.wiki/w/命令/enchant) | 为玩家手持物品附魔 | |
| [`/fill`](https://zh.minecraft.wiki/w/命令/fill) | 用指定方块填充区域 | ✔ |
| [`/gamemode`](https://zh.minecraft.wiki/w/命令/gamemode) | 切换玩家游戏模式 | |
| [`/give`](https://zh.minecraft.wiki/w/命令/give) | 给予玩家指定物品 | |
| [`/item`](https://zh.minecraft.wiki/w/命令/item) | 修改容器或实体装备栏中的物品 | ✔ |
| [`/ride`](https://zh.minecraft.wiki/w/命令/ride) | 控制实体的骑乘关系 | ✔ |
| [`/save-all`](https://zh.minecraft.wiki/w/命令/save) | 立即保存服务器世界数据 | ✔ |
| [`/seed`](https://zh.minecraft.wiki/w/命令/seed) | 显示当前世界的种子 | |
| [`/setblock`](https://zh.minecraft.wiki/w/命令/setblock) | 在指定位置放置方块 | ✔ |
| [`/summon`](https://zh.minecraft.wiki/w/命令/summon) | 在指定位置生成实体 | ✔ |
| [`/tp`](https://zh.minecraft.wiki/w/命令/tp) | 传送实体到指定位置或其他实体处 | |
| [`/tellraw`](https://zh.minecraft.wiki/w/命令/tellraw) | 向玩家发送格式化的 JSON 文本消息 | |
| [`/time`](https://zh.minecraft.wiki/w/命令/time) | 查询或修改世界时间 | |
| [`/weather`](https://zh.minecraft.wiki/w/命令/weather) | 切换世界天气 | |
