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
<tr><td>Spawn</td><td><code>/spawn</code></td><td>Return to the main city</td></tr>
<tr><td>Vanilla teleport</td><td><a href="https://minecraft.wiki/w/Commands/tp"><code>/tp</code></a></td><td>Teleport to specific coordinates or another player</td></tr>
<tr><td rowspan="5">Homes</td><td><code>/sethome &lt;name&gt;</code></td><td>Save your current position as a home.</td></tr>
<tr><td><code>/home</code> or <code>/home gui</code></td><td>Open the home menu to teleport</td></tr>
<tr><td><code>/home &lt;name&gt;</code></td><td>Return directly to a saved home</td></tr>
<tr><td><code>/home icon &lt;material&gt; &lt;name&gt;</code></td><td>Set a custom home icon, for example <code>/home icon diamond_block home</code></td></tr>
<tr><td><code>/delhome &lt;name&gt;</code></td><td>Delete a saved home. New players can save up to 2 homes; full members can save up to 20</td></tr>
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
<tr><td rowspan="2">Idle status</td><td><code>/afk</code></td><td>Toggle idle status</td></tr>
<tr><td><code>/afk &lt;status&gt;</code></td><td>Go idle and show a custom status above your head and in the tab list, up to 12 characters</td></tr>
<tr><td>Announcements</td><td><code>/announcements</code></td><td>Open the server announcements menu</td></tr>
<tr><td>Tips</td><td><code>/tip</code></td><td>Show one server tip</td></tr>
<tr><td>Main menu</td><td><code>/menu</code></td><td>Open the main menu</td></tr>
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
<tr><td>Hat</td><td><code>/hat</code></td><td>Wear the item in your hand as a hat</td></tr>
<tr><td rowspan="4">Name tag</td><td><code>/nametag</code></td><td>View your current custom prefix and suffix</td></tr>
<tr><td><code>/nametag prefix set &lt;content&gt;</code></td><td>Set your name prefix. Requires full member status</td></tr>
<tr><td><code>/nametag suffix set &lt;content&gt;</code></td><td>Set your name suffix. Requires full member status</td></tr>
<tr><td><code>/nametag clear</code></td><td>Clear your custom prefix and suffix</td></tr>
<tr><td>Armor stands</td><td><code>/asedit give</code></td><td>Get the armor stand editor tool</td></tr>
<tr><td rowspan="2">Invisible item frames</td><td><code>/imageframe giveinvisibleframe glowing</code></td><td>Get glowing invisible item frames</td></tr>
<tr><td><code>/imageframe giveinvisibleframe regular</code></td><td>Get regular invisible item frames</td></tr>
<tr><td rowspan="3">Poses</td><td><code>/sit</code></td><td>Sit down</td></tr>
<tr><td><code>/lay</code></td><td>Lie down</td></tr>
<tr><td><code>/crawl</code></td><td>Crawl</td></tr>
<tr><td>Trash</td><td><code>/trash</code></td><td>Open the trash interface. Anything placed inside is deleted permanently</td></tr>
</tbody>
</table>

## Item & World Management

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">Dropped item cleanup</td><td><code>/rmitems</code></td><td>Remove nearby dropped items with the default 50-block radius</td></tr>
<tr><td><code>/rmitems &lt;radius&gt;</code></td><td>Remove dropped items within a custom radius, for example <code>/rmitems 20</code></td></tr>
<tr><td>Temporary whitelist</td><td><code>/tempwhitelist &lt;player&gt;</code></td><td>Add a 1-hour temporary whitelist entry for a friend. Requires full member status</td></tr>
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

<table>
<thead>
<tr><th scope="col">Feature</th><th scope="col">Common Usage</th><th scope="col">Notes</th></tr>
</thead>
<tbody>
<tr><td>PVP status</td><td><code>/pvp</code></td><td>Manually toggle your PVP status. PVP is disabled by default</td></tr>
</tbody>
</table>

> Please only enable PVP when both sides agree.

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
