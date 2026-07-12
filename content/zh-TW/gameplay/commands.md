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
<tr><td>主城</td><td><code>/spawn</code> 或 <code>/lobby</code></td><td>回到主城</td></tr>
<tr><td>原版传送</td><td><a href="https://zh.minecraft.wiki/w/命令/tp"><code>/tp</code></a></td><td>传送到指定坐标或玩家位置</td></tr>
<tr><td rowspan="5">家</td><td><code>/sethome &lt;名字&gt;</code></td><td>把当前位置保存为一个家</td></tr>
<tr><td><code>/home</code> 或 <code>/home gui</code></td><td>打开家菜单</td></tr>
<tr><td><code>/home &lt;名字&gt;</code></td><td>直接回到指定的家</td></tr>
<tr><td><code>/home icon &lt;材质&gt; &lt;名字&gt;</code></td><td>把指定材质设置为家的图标，例如 <code>/home icon diamond_block home</code></td></tr>
<tr><td><code>/delhome &lt;名字&gt;</code></td><td>删除指定的家；新成员最多 2 个家，正式成员最多 20 个家</td></tr>
<tr><td>传送保护</td><td><code>/menu</code> → 传送保护</td><td>设置普通玩家是否可以用 <code>/tp</code> 移动你，以及是否在挂机时自动拒绝被传送</td></tr>
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
<tr><td rowspan="2">挂机状态</td><td><code>/afk</code> 或 <code>/away</code></td><td>切换挂机状态；长时间无操作也会自动进入挂机</td></tr>
<tr><td><code>/afk &lt;状态&gt;</code></td><td>进入挂机并把自定义状态显示在头顶和 Tab 列表，最多 20 个字符</td></tr>
<tr><td>公告</td><td><code>/announcements</code></td><td>打开服务器公告菜单；上线时会提示未读公告，打开菜单后视为已读</td></tr>
<tr><td>小提示</td><td><code>/tip</code></td><td>查看一条服务器小提示，服务器也会不定期推送提示</td></tr>
<tr><td>主菜单</td><td><code>/menu</code></td><td>打开主菜单</td></tr>
<tr><td>语言</td><td><code>/lang</code></td><td>打开语言设置菜单，也可以从主菜单进入</td></tr>
<tr><td>网页登录</td><td><code>/weblogin &lt;验证码&gt;</code></td><td>确认网页端登录，通常从网站复制完整命令后在游戏内执行，需要正式成员权限</td></tr>
</tbody>
</table>

## 聊天与私信

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td>公共频道</td><td><code>/chat</code> 或 <code>/global</code></td><td>回到公共聊天频道</td></tr>
<tr><td rowspan="2">私聊频道</td><td><code>/msg &lt;玩家&gt;</code></td><td>切换到与该玩家的私聊频道；如果当前已经在这个私聊频道，再执行一次会回到公共频道</td></tr>
<tr><td><code>/msg</code></td><td>已经在任意私聊频道时，直接执行会回到公共频道</td></tr>
<tr><td>临时私信</td><td><code>/msg &lt;玩家&gt; &lt;消息&gt;</code></td><td>发送一条私信但不改变当前聊天频道；<code>/tell</code>、<code>/w</code>、<code>/whisper</code> 也可使用同样写法</td></tr>
<tr><td>快速回复</td><td><code>/r &lt;消息&gt;</code> 或 <code>/reply &lt;消息&gt;</code></td><td>回复最近私聊过的玩家，同样不会改变当前聊天频道</td></tr>
<tr><td rowspan="5">聊天增强</td><td><code>@玩家名</code> 或直接输入玩家名</td><td>提及当前频道可见的玩家；大小写不敏感，例如 <code>@steve</code> 或 <code>steve</code> 会显示为 <code>@Steve</code></td></tr>
<tr><td><code>%i</code>、<code>[i]</code> 或 <code>[item]</code></td><td>在聊天中展示手中物品</td></tr>
<tr><td><code>%num</code>，例如 <code>%1</code></td><td>在聊天中展示对应物品栏格子的物品；<code>%1</code> 是物品栏第一格，支持 <code>%1</code> 到 <code>%36</code></td></tr>
<tr><td>链接、<code>av</code> / <code>BV</code> 号</td><td>网址和 Bilibili 视频号会自动显示为可点击文本</td></tr>
<tr><td>MiniMessage 样式</td><td>正式成员可在聊天中使用颜色、粗体/斜体等装饰、渐变、彩虹与 reset；不支持点击事件、选择器、换行等标签</td></tr>
<tr><td rowspan="2">聊天设置</td><td><code>/menu</code> → 聊天设置</td><td>设置提及提醒和聊天延迟；延迟可选 <code>off</code>、<code>3s</code>、<code>5s</code>、<code>7s</code>，启用后所有聊天频道都会在指定时间后发送</td></tr>
<tr><td><code>/cancel</code> 或 <code>/c</code></td><td>取消自己尚未发送的延迟消息</td></tr>
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
<tr><td>帽子</td><td><code>/hat</code> 或 <code>/head</code></td><td>将手中持有的物品戴到头上</td></tr>
<tr><td>盔甲架</td><td><code>/asedit give</code></td><td>获取盔甲架编辑器</td></tr>
<tr><td rowspan="2">隐形展示框</td><td><code>/imageframe giveinvisibleframe glowing</code></td><td>获取发光隐形展示框</td></tr>
<tr><td><code>/imageframe giveinvisibleframe regular</code></td><td>获取普通隐形展示框</td></tr>
<tr><td rowspan="3">姿势动作</td><td><code>/sit</code></td><td>坐下</td></tr>
<tr><td><code>/lay</code></td><td>躺下</td></tr>
<tr><td><code>/crawl</code></td><td>爬行</td></tr>
<tr><td>垃圾桶</td><td><code>/trash</code>、<code>/trashcan</code> 或 <code>/garbage</code></td><td>打开垃圾桶界面，放入其中的物品将被永久销毁</td></tr>
</tbody>
</table>

### 名称标签

名称标签用于自定义聊天中玩家名两侧的前缀和后缀。它需要正式成员权限，适合放短称号、颜色样式或简单状态，不建议写太长的句子。

<table>
<thead>
<tr><th scope="col">用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td><code>/nametag</code> 或 <code>/nametag view</code></td><td>查看当前前缀、后缀、聊天预览，并打开格式编辑器链接</td></tr>
<tr><td><code>/nametag prefix</code></td><td>只查看当前前缀</td></tr>
<tr><td><code>/nametag suffix</code></td><td>只查看当前后缀</td></tr>
<tr><td><code>/nametag prefix set &lt;内容&gt;</code></td><td>设置名称前缀</td></tr>
<tr><td><code>/nametag suffix set &lt;内容&gt;</code></td><td>设置名称后缀</td></tr>
<tr><td><code>/nametag prefix clear</code> 或 <code>/nametag suffix clear</code></td><td>只清除前缀或后缀</td></tr>
<tr><td><code>/nametag clear</code></td><td>同时清除自定义前缀和后缀</td></tr>
</tbody>
</table>

限制与格式：

- 前缀和后缀内容各最多 200 个字符。
- `set` 内容不能为空；如需删除请使用对应的 `clear` 命令。
- 内容使用 MiniMessage 格式，支持颜色、粗体/斜体等装饰、渐变、彩虹、悬浮提示等常用标签。
- 不支持点击事件、选择器等可能影响安全或聊天显示的标签。
- 可使用 `%player_...%` 这类玩家相关 PlaceholderAPI 变量，其他占位符不会被接受。

## 物品与世界管理

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">清理掉落物</td><td><code>/rmitems</code> 或 <code>/removeitems</code></td><td>按默认 50 格半径清理周围掉落物</td></tr>
<tr><td><code>/rmitems &lt;半径&gt;</code></td><td>按指定半径清理掉落物，例如 <code>/rmitems 20</code>，半径范围为 1 到 300</td></tr>
<tr><td>临时白名单</td><td><code>/tempwhitelist &lt;玩家名&gt;</code>、<code>/twl &lt;玩家名&gt;</code> 或 <code>/tempwl &lt;玩家名&gt;</code></td><td>为朋友添加 1 小时临时白名单，需要正式成员权限</td></tr>
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

PVP 默认关闭。请只在双方同意的情况下开启；战斗中会进入短暂锁定状态，锁定结束前不能关闭 PVP。

<table>
<thead>
<tr><th scope="col">功能</th><th scope="col">常用用法</th><th scope="col">说明</th></tr>
</thead>
<tbody>
<tr><td rowspan="6">PVP 状态</td><td><code>/pvp</code> 或 <code>/pvp toggle</code></td><td>切换自己的 PVP 状态</td></tr>
<tr><td><code>/pvp on</code></td><td>开启自己的 PVP</td></tr>
<tr><td><code>/pvp off</code></td><td>关闭自己的 PVP；战斗锁定期间无法关闭</td></tr>
<tr><td><code>/pvp status</code></td><td>查看自己的 PVP 状态和当前设置</td></tr>
<tr><td><code>/pvp gui</code> 或 <code>/pvp settings</code></td><td>打开 PVP 设置菜单</td></tr>
<tr><td><code>/pvp help</code></td><td>查看 PVP 命令帮助</td></tr>
</tbody>
</table>

PVP 设置菜单包含：

- PVP 开关：是否允许你参与玩家对战。
- 生物保护：默认开启，用于保护你驯服的生物，以及你骑乘时相关的生物保护逻辑。
- 骑乘生物伤害：默认允许；可控制你骑乘生物时，其他已开启 PVP 的玩家是否可以攻击相关生物。
- 死亡后自动开启：默认开启；关闭 PVP 的玩家死亡后会自动开启 PVP，方便继续参与对战。

如果你关闭 PVP 但主动攻击已开启 PVP 的玩家，第一次攻击会被取消并提示；短时间内再次攻击同一玩家会自动为你开启 PVP。

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
