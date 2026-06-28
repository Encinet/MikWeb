---
title: Common Commands
description: A practical command reference for travel, building, decoration, and server-side tools.
order: 20
icon: Wrench
---

This page lists commands for regular players. New players start with Yellow Name status, and promoted players become White Name full members. Staff/admin commands are not listed here.

If you need the full syntax for a vanilla command, see the final section, "Vanilla Command Reference."

## Teleportation & Navigation

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td>Spawn</td><td><code>/spawn</code> or <code>/lobby</code></td><td>Return to the main city</td></tr>
<tr><td>Vanilla teleport</td><td><a href="https://minecraft.wiki/w/Commands/tp"><code>/tp</code></a></td><td>Teleport to specific coordinates or another player</td></tr>
<tr><td rowspan="5">Homes</td><td><code>/sethome &lt;name&gt;</code></td><td>Save your current position as a home.</td></tr>
<tr><td><code>/home</code> or <code>/home gui</code></td><td>Open the home menu to teleport</td></tr>
<tr><td><code>/home &lt;name&gt;</code></td><td>Return directly to a saved home</td></tr>
<tr><td><code>/home icon &lt;material&gt; &lt;name&gt;</code></td><td>Set a custom home icon, for example <code>/home icon diamond_block home</code></td></tr>
<tr><td><code>/delhome &lt;name&gt;</code></td><td>Delete a saved home. New players can save up to 2 homes; full members can save up to 20</td></tr>
<tr><td>Teleport protection</td><td><code>/menu</code> → Teleport Protection</td><td>Choose whether normal players can move you with <code>/tp</code>, and whether teleport attempts are rejected while you are AFK</td></tr>
<tr><td rowspan="3">Back history</td><td><code>/back</code></td><td>Return to your previous teleport or death location</td></tr>
<tr><td><code>/back [times]</code></td><td>Go back multiple history entries at once</td></tr>
<tr><td><code>/back undo</code> or <code>/reback</code></td><td>Undo your last back step and return to where you just were</td></tr>
</tbody>
</table>

## Status & Server Info

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">Idle status</td><td><code>/afk</code> or <code>/away</code></td><td>Toggle idle status. Long inactivity also marks you as AFK automatically</td></tr>
<tr><td><code>/afk &lt;status&gt;</code></td><td>Go idle and show a custom status above your head and in the tab list, up to 20 characters</td></tr>
<tr><td>Announcements</td><td><code>/announcements</code></td><td>Open the server announcements menu. Unread announcements are shown when you join, and opening the menu marks them as seen</td></tr>
<tr><td>Tips</td><td><code>/tip</code></td><td>Show one server tip. The server may also send tips periodically</td></tr>
<tr><td>Main menu</td><td><code>/menu</code></td><td>Open the main menu</td></tr>
<tr><td>Language</td><td><code>/lang</code></td><td>Open the language settings menu. You can also open it from the main menu</td></tr>
<tr><td>Web login</td><td><code>/weblogin &lt;code&gt;</code></td><td>Confirm a website login, usually by copying the full command from the website and running it in-game. Requires full member status</td></tr>
</tbody>
</table>

## Chat & Messages

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td>Public channel</td><td><code>/chat</code> or <code>/global</code></td><td>Return to public chat</td></tr>
<tr><td rowspan="2">Private channel</td><td><code>/msg &lt;player&gt;</code></td><td>Switch to a private chat channel with that player. If you are already in that private channel, running it again returns you to public chat</td></tr>
<tr><td><code>/msg</code></td><td>When you are already in any private chat channel, return to public chat</td></tr>
<tr><td>One-time private message</td><td><code>/msg &lt;player&gt; &lt;message&gt;</code></td><td>Send one private message without changing your current chat channel. <code>/tell</code>, <code>/w</code>, and <code>/whisper</code> use the same format</td></tr>
<tr><td>Quick reply</td><td><code>/r &lt;message&gt;</code> or <code>/reply &lt;message&gt;</code></td><td>Reply to the player you most recently messaged, without changing your current chat channel</td></tr>
<tr><td rowspan="3">Chat enhancements</td><td><code>@player</code> or the player name directly</td><td>Mention a player visible in the current channel. Mentions are case-insensitive; for example, <code>@steve</code> or <code>steve</code> displays as <code>@Steve</code></td></tr>
<tr><td><code>[item]</code> or <code>[i]</code></td><td>Show the item in your hand in chat</td></tr>
<tr><td>Links, <code>av</code> / <code>BV</code> IDs</td><td>URLs and Bilibili video IDs are automatically displayed as clickable text</td></tr>
<tr><td>Mention alerts</td><td><code>/menu</code> → Mention Alerts</td><td>Choose whether mentions play a sound, show an action bar prompt, or mute while you are AFK</td></tr>
</tbody>
</table>

## Building & Editing

### Axiom

**Axiom** is a powerful all-in-one world editing mod for Minecraft, with features like terrain sculpting, precision building tools, and brush-based editing.

- [Modrinth Page](https://modrinth.com/mod/axiom) - Download the mod
- [Server Axiom Guide](https://hi-ysumc.feishu.cn/wiki/QDJBwtCBEi5eLakfWCvcRtErnvb) - A server-specific tutorial

> **Quick shortcuts:**
>
> - Hold `Left Alt` in Creative mode to open the Builder menu
> - Press `Right Shift` to enter Editor mode for terrain tools, brushes, and more

### WorldEdit

**WorldEdit** is the classic building plugin for copying, pasting, rotating, and reshaping structures at scale. It pairs especially well with Axiom.

WorldEdit is already installed on the server, so you do not need a separate client mod to use it.

- [Common Commands Overview (Chinese)](https://www.mcmod.cn/post/3050.html)
- [Full Command Reference (Chinese)](https://www.mcmod.cn/post/3533.html)
- [Official Command List (English)](https://intellectualsites.gitbook.io/fastasyncworldedit/features/main-commands-and-permissions)

## Decoration & Interaction

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td>Decorative heads</td><td><code>/headdb</code></td><td>Open the decorative head database and browse custom heads</td></tr>
<tr><td>Hat</td><td><code>/hat</code> or <code>/head</code></td><td>Wear the item in your hand as a hat</td></tr>
<tr><td>Armor stands</td><td><code>/asedit give</code></td><td>Get the armor stand editor tool</td></tr>
<tr><td rowspan="2">Invisible item frames</td><td><code>/imageframe giveinvisibleframe glowing</code></td><td>Get glowing invisible item frames</td></tr>
<tr><td><code>/imageframe giveinvisibleframe regular</code></td><td>Get regular invisible item frames</td></tr>
<tr><td rowspan="3">Poses</td><td><code>/sit</code></td><td>Sit down</td></tr>
<tr><td><code>/lay</code></td><td>Lie down</td></tr>
<tr><td><code>/crawl</code></td><td>Crawl</td></tr>
<tr><td>Trash</td><td><code>/trash</code>, <code>/trashcan</code>, or <code>/garbage</code></td><td>Open the trash interface. Anything placed inside is deleted permanently</td></tr>
</tbody>
</table>

### Name Tags

Name tags let full members customize the prefix and suffix shown around their player name in chat. They are best for short titles, color styling, or simple status text rather than long sentences.

<table>
<thead>
<tr><th scope="col">Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td><code>/nametag</code> or <code>/nametag view</code></td><td>View your current prefix, suffix, chat preview, and formatting editor links</td></tr>
<tr><td><code>/nametag prefix</code></td><td>View only your current prefix</td></tr>
<tr><td><code>/nametag suffix</code></td><td>View only your current suffix</td></tr>
<tr><td><code>/nametag prefix set &lt;content&gt;</code></td><td>Set your name prefix</td></tr>
<tr><td><code>/nametag suffix set &lt;content&gt;</code></td><td>Set your name suffix</td></tr>
<tr><td><code>/nametag prefix clear</code> or <code>/nametag suffix clear</code></td><td>Clear only your prefix or suffix</td></tr>
<tr><td><code>/nametag clear</code></td><td>Clear both your custom prefix and suffix</td></tr>
</tbody>
</table>

Limits and formatting:

- Prefix and suffix content can each be up to 200 characters.
- `set` content cannot be empty; use the matching `clear` command to remove a tag.
- Content uses MiniMessage formatting, including common tags such as colors, text decorations, gradients, rainbow text, and hover text.
- Click events, selectors, and similar tags that may affect safety or chat display are not supported.
- Player-related PlaceholderAPI variables such as `%player_...%` are allowed; other placeholders are rejected.

## Item & World Management

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">Dropped item cleanup</td><td><code>/rmitems</code> or <code>/removeitems</code></td><td>Remove nearby dropped items with the default 50-block radius</td></tr>
<tr><td><code>/rmitems &lt;radius&gt;</code></td><td>Remove dropped items within a custom radius, for example <code>/rmitems 20</code>. Radius must be between 1 and 300</td></tr>
<tr><td>Temporary whitelist</td><td><code>/tempwhitelist &lt;player&gt;</code>, <code>/twl &lt;player&gt;</code>, or <code>/tempwl &lt;player&gt;</code></td><td>Add a 1-hour temporary whitelist entry for a friend. Requires full member status</td></tr>
</tbody>
</table>

> Players with yellow-name status (the default status for new players) cannot use `/rmitems` or `/tempwhitelist`.

## Music & Fun

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td rowspan="5">Music</td><td><code>/music</code></td><td>Open the music console. Requires <a href="https://modrinth.com/plugin/plasmo-voice">PlasmoVoice</a></td></tr>
<tr><td><code>/music search &lt;keyword&gt;</code></td><td>Search songs</td></tr>
<tr><td><code>/music page &lt;page&gt;</code></td><td>Switch music list pages</td></tr>
<tr><td><code>/music random</code></td><td>Get a random disc</td></tr>
<tr><td><code>/music randomplay</code></td><td>Play random music at the nearest jukebox</td></tr>
<tr><td>Fireworks</td><td><code>/firework gun</code></td><td>Get a random firework launcher</td></tr>
</tbody>
</table>

## PVP

PVP is disabled by default. Only enable it when both sides agree. After real player combat, you are briefly combat-locked and cannot turn PVP off until the lock expires.

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td rowspan="6">PVP status</td><td><code>/pvp</code> or <code>/pvp toggle</code></td><td>Toggle your PVP status</td></tr>
<tr><td><code>/pvp on</code></td><td>Turn your PVP on</td></tr>
<tr><td><code>/pvp off</code></td><td>Turn your PVP off. This is blocked while combat-locked</td></tr>
<tr><td><code>/pvp status</code></td><td>Show your PVP status and current settings</td></tr>
<tr><td><code>/pvp gui</code> or <code>/pvp settings</code></td><td>Open the PVP settings menu</td></tr>
<tr><td><code>/pvp help</code></td><td>Show PVP command help</td></tr>
</tbody>
</table>

The PVP settings menu includes:

- PVP toggle: whether you can participate in player combat.
- Mob protection: enabled by default. Protects your tamed mobs and related mounted-mob cases.
- Mounted mob damage: allowed by default. Controls whether other PVP-enabled players can damage related mobs while you are mounted.
- Enable on death: enabled by default. If your PVP is off, dying turns it on so you can continue participating.

If your PVP is off and you attack a player whose PVP is on, the first hit is cancelled with a warning. Attacking the same player again shortly after automatically turns your PVP on.

## Mini-Games

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td>Parkour</td><td><code>/apk start</code></td><td>Start the parkour challenge. The difficulty increases as you progress</td></tr>
<tr><td>Who's the Killer</td><td><code>/spy</code></td><td>Join the "Who's the Killer" mini-game</td></tr>
</tbody>
</table>

## Vanilla Command Reference

The following vanilla commands are available on the server. Click a command name to open the Minecraft Wiki entry with full syntax and details:

| Command | Description | Member Only |
|------|------|:----------:|
| [`/attribute`](https://minecraft.wiki/w/Commands/attribute) | View or change an entity's attribute values | ✔ |
| [`/clear`](https://minecraft.wiki/w/Commands/clear) | Remove items from a player's inventory | |
| [`/damage`](https://minecraft.wiki/w/Commands/damage) | Deal a specific type and amount of damage to an entity | ✔ |
| [`/effect`](https://minecraft.wiki/w/Commands/effect) | Apply or remove status effects | ✔ |
| [`/enchant`](https://minecraft.wiki/w/Commands/enchant) | Enchant the item a player is holding | |
| [`/fill`](https://minecraft.wiki/w/Commands/fill) | Fill an area with blocks | ✔ |
| [`/gamemode`](https://minecraft.wiki/w/Commands/gamemode) | Change a player's game mode | |
| [`/give`](https://minecraft.wiki/w/Commands/give) | Give an item to a player | |
| [`/item`](https://minecraft.wiki/w/Commands/item) | Edit items in containers or equipment slots | ✔ |
| [`/ride`](https://minecraft.wiki/w/Commands/ride) | Control riding relationships between entities | ✔ |
| [`/save-all`](https://minecraft.wiki/w/Commands/save) | Save the world immediately | ✔ |
| [`/seed`](https://minecraft.wiki/w/Commands/seed) | Show the world seed | |
| [`/setblock`](https://minecraft.wiki/w/Commands/setblock) | Place a block at a specific position | ✔ |
| [`/summon`](https://minecraft.wiki/w/Commands/summon) | Summon an entity at a specific position | ✔ |
| [`/tp`](https://minecraft.wiki/w/Commands/tp) | Teleport to coordinates or another entity | |
| [`/tellraw`](https://minecraft.wiki/w/Commands/tellraw) | Send formatted JSON chat messages | |
| [`/time`](https://minecraft.wiki/w/Commands/time) | Check or change the world time | |
| [`/weather`](https://minecraft.wiki/w/Commands/weather) | Change the weather | |
