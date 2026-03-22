# Common Commands

Below is a list of commonly used commands on the server. Click on any vanilla command name to visit the Minecraft Wiki for detailed usage.

## Vanilla Commands

The server supports the following vanilla commands. Click to view detailed documentation:

| Command | Description | Requires Member |
|---------|-------------|:-------------------:|
| [`/attribute`](https://minecraft.wiki/w/Commands/attribute) | Query or modify an entity's attributes | ✔ |
| [`/clear`](https://minecraft.wiki/w/Commands/clear) | Remove items from a player's inventory | |
| [`/damage`](https://minecraft.wiki/w/Commands/damage) | Deal damage of a specified type and amount to an entity | ✔ |
| [`/effect`](https://minecraft.wiki/w/Commands/effect) | Add or remove status effects from an entity | ✔ |
| [`/enchant`](https://minecraft.wiki/w/Commands/enchant) | Enchant the item a player is holding | |
| [`/fill`](https://minecraft.wiki/w/Commands/fill) | Fill a region with a specified block | ✔ |
| [`/gamemode`](https://minecraft.wiki/w/Commands/gamemode) | Change a player's game mode | |
| [`/give`](https://minecraft.wiki/w/Commands/give) | Give a player a specified item | |
| [`/item`](https://minecraft.wiki/w/Commands/item) | Modify items in a container or entity's equipment slots | ✔ |
| [`/ride`](https://minecraft.wiki/w/Commands/ride) | Control the riding relationship between entities | ✔ |
| [`/save-all`](https://minecraft.wiki/w/Commands/save) | Immediately save the server world data | ✔ |
| [`/seed`](https://minecraft.wiki/w/Commands/seed) | Display the current world seed | |
| [`/setblock`](https://minecraft.wiki/w/Commands/setblock) | Place a block at a specified position | ✔ |
| [`/summon`](https://minecraft.wiki/w/Commands/summon) | Spawn an entity at a specified position | ✔ |
| [`/tp`](https://minecraft.wiki/w/Commands/tp) | Teleport an entity to a position or another entity | |
| [`/tellraw`](https://minecraft.wiki/w/Commands/tellraw) | Send a formatted JSON text message to a player | |
| [`/time`](https://minecraft.wiki/w/Commands/time) | Query or modify the world time | |
| [`/weather`](https://minecraft.wiki/w/Commands/weather) | Change the world weather | |

## Teleportation & Navigation

| Command | Description |
|---------|-------------|
| `/spawn` | Return to the main city spawn |
| [`/tp`](https://minecraft.wiki/w/Commands/tp) | Teleport to specific coordinates or a player |
| `/sethome` | Save your current position as home |
| `/home` | Teleport to your saved home |
| `/delhome` | Delete a saved home |
| `/homelist` | View all your saved homes |
| `/back` | Return to your previous location (e.g. death point or pre-teleport position) |

## Building & Creation

### Axiom

**Axiom** is a powerful all-in-one Minecraft world editing mod that supports real-time terrain sculpting, building assistance, brush tools, and more.

- [Modrinth Page](https://modrinth.com/mod/axiom) — Download the mod
- [Server Axiom Tutorial](https://hi-ysumc.feishu.cn/wiki/QDJBwtCBEi5eLakfWCvcRtErnvb) — Server-specific usage guide

> **Keyboard Shortcuts:**
> - Hold `Left Alt` in Creative Mode to open the Builder menu
> - Press `Right Shift` to enter Editor mode (terrain editing, brush tools, etc.)

### WorldEdit

**WorldEdit** is a classic building plugin great for quickly copying, pasting, rotating structures, and making large-scale terrain adjustments. Works best when combined with Axiom.

WorldEdit is built into the server — no client-side installation needed to use it.

- [Commands List](https://intellectualsites.gitbook.io/fastasyncworldedit/features/main-commands-and-permissions)

## Decoration & Interaction

| Command | Description |
|---------|-------------|
| `/headdb` | Open the decorative head database to browse and obtain decorative heads |
| `/hat` | Wear the item in your hand as a hat |
| `/asedit give` | Obtain the armor stand editor tool |
| `/sit` | Sit down on a block |
| `/lay` | Lie down |
| `/crawl` | Crawl |
| `/trash` | Open the trash bin — any items placed inside will be permanently deleted |

## Item & World Management

| Command | Description |
|---------|-------------|
| `/rmitems [radius]` | Clear dropped items nearby. Defaults to a 50-block radius. You can specify a custom radius, e.g. `/rmitems 20` to only clear within 20 blocks |

> Players with "Yellow" (probationary) status cannot use `/rmitems`.

## Music & Entertainment

| Command | Description |
|---------|-------------|
| `/music` | Open the music console to play or control background music (requires [PlasmoVoice](https://modrinth.com/plugin/plasmo-voice) mod) |
| `/firework gun` | Get a random firework launcher |

## PVP Toggle

| Command | Description |
|---------|-------------|
| `/pvp` | Manually toggle your PVP status (PVP is disabled on the server by default) |

> PVP is off by default. Please only enable it with mutual consent from both parties.

## Mini-Games

| Command | Description |
|---------|-------------|
| `/apk start` | Start a parkour challenge (difficulty increases as you progress) |
| `/spy` | Join the "Who's the Killer" mini-game |
