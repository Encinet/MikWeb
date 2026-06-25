# Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved MikWeb homepage visual redesign with a more immersive hero, new palette, and a right-side `MIK` typographic monument while preserving existing copy and behavior.

**Architecture:** Keep the route thin and implement the homepage changes inside `src/modules/home/ui/home-page.tsx`. Add reusable, page-specific styling in `src/app/globals.css` using the existing token system instead of adding dependencies or assets. Keep the existing animated background architecture in `src/site/background/ui/site-background.tsx`, only replacing the old gold/green/purple light palette with coral/aqua/clay.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS utility classes, global CSS tokens, `next-intl`, `lucide-react`, existing `ScrollReveal`, Bun project scripts.

## Global Constraints

- 保留现有首页文案和 i18n key，不改文案语义。
- 用户指定新的核心配色：`#F6B4A6`：珊瑚粉，作为主强调色；`#70ACC2`：湖蓝，作为空间光和冷色辅助；`#DC8C6B`：陶土橙，作为暖色辅助。
- 右侧主视觉不使用 Minecraft 图标或复杂图形，而使用 `MIK` 三个字母作为巨大艺术字主视觉。
- 第一版使用系统衬线 fallback：`font-family: Georgia, "Times New Roman", serif;`。
- 暂不引入外部字体 CDN，避免加载不稳定和授权风险。
- 不引入外部图片、Canvas、WebGL 或大型新依赖。
- 保留现有旋转背景机制和性能优化。
- 所有新增动效需要遵守 `prefers-reduced-motion: reduce`。
- 桌面、平板、手机布局不溢出，内容优先级清晰。
- 实现后运行：`bun check`。

---

## File Structure

- Modify `src/app/globals.css`
  - Update global theme tokens from the old gold direction to coral/aqua/clay.
  - Replace key hard-coded gold UI accents with the approved palette.
  - Add focused homepage classes for the immersive hero shell, hero left column, `MIK` monument, feature cards, responsive behavior, and reduced-motion handling.
- Modify `src/site/background/ui/site-background.tsx`
  - Replace `LIGHT_SPOTS` IDs and rgba colors from `gold`/`green`/`purple` to `coral`/`aqua`/`clay`.
  - Do not change the rAF loop, rotation math, or reduced-motion behavior.
- Modify `src/modules/home/ui/home-page.tsx`
  - Restructure the hero from centered single-column to a two-column hero.
  - Preserve every existing `t('home....')` key and semantic copy.
  - Add right-side `MIK` visual markup using CSS classes.
  - Move feature cards before `HomeLiveOverview`.
  - Keep `HomeLiveOverview`, `ScrollReveal`, and lucide icons.

---

### Task 1: Update theme palette and homepage CSS foundation

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Existing CSS custom properties such as `--brand-gold`, `--theme-bg-base`, `--theme-accent-blue`, `--theme-accent-amber`, and `.hero-join-btn`.
- Produces: CSS classes used by Task 3:
  - `.home-hero`
  - `.home-hero__content`
  - `.home-hero__copy`
  - `.home-hero__badge`
  - `.home-hero__title`
  - `.home-hero__description`
  - `.home-hero__actions`
  - `.home-hero__notice`
  - `.home-hero__visual`
  - `.home-mik-monument`
  - `.home-mik-monument__fill`
  - `.home-mik-monument__stroke`
  - `.home-mik-monument__orbit`
  - `.home-mik-monument__glow`
  - `.home-feature-grid`
  - `.home-feature-card`
  - `.home-feature-card--coral`
  - `.home-feature-card--aqua`

- [ ] **Step 1: Inspect the current CSS color and hero sections**

Run:

```bash
rg -n "brand-gold|theme-bg-base|theme-bg-gradient|theme-accent|hero-join-btn|#ffaa00|255, 170, 0|85, 255, 85|124, 58, 237" src/app/globals.css
```

Expected: A list of token definitions and hard-coded old gold accent usages in `src/app/globals.css`.

- [ ] **Step 2: Update dark and light theme tokens**

In `src/app/globals.css`, update the existing token definitions to keep the same variable names but change their values to the approved palette.

Use these exact values for the relevant dark theme tokens:

```css
:root {
  --brand-gold: #f6b4a6;
  --brand-gold-hover: #dc8c6b;
}

:root,
[data-theme="dark"] {
  --theme-bg-base: #071015;
  --theme-bg-gradient-from: #071015;
  --theme-bg-gradient-to: #261615;
  --theme-accent-blue: #70acc2;
  --theme-accent-blue-strong: #9ed2e4;
  --theme-accent-purple: #dc8c6b;
  --theme-accent-purple-strong: #f6b4a6;
  --theme-accent-red: #dc8c6b;
  --theme-accent-red-strong: #ffc2ad;
  --theme-accent-green: #70acc2;
  --theme-accent-green-strong: #9ed2e4;
  --theme-accent-amber: #f6b4a6;
  --theme-accent-amber-strong: #ffd0c5;
  --theme-accent-brand-casual: #70acc2;
  --theme-accent-brand-casual-strong: #9ed2e4;
}
```

Use these exact values for the relevant light theme tokens:

```css
[data-theme="light"] {
  --theme-bg-base: #fbf7f2;
  --theme-bg-gradient-from: #fffaf5;
  --theme-bg-gradient-to: #edf5f7;
  --theme-accent-blue: #4f93aa;
  --theme-accent-blue-strong: #286b82;
  --theme-accent-purple: #dc8c6b;
  --theme-accent-purple-strong: #b86f52;
  --theme-accent-red: #dc8c6b;
  --theme-accent-red-strong: #b86f52;
  --theme-accent-green: #70acc2;
  --theme-accent-green-strong: #4f93aa;
  --theme-accent-amber: #dc8c6b;
  --theme-accent-amber-strong: #b86f52;
  --theme-accent-brand-casual: #4f93aa;
  --theme-accent-brand-casual-strong: #286b82;
}
```

Do not rename variables in this task. Keeping `gold`/`amber` names is intentional to reduce change scope.

- [ ] **Step 3: Replace key old gold hard-coded UI accents**

In `src/app/globals.css`, replace old hard-coded gold values in scrollbar, buttons, and common accent shadows.

Apply these replacements where the exact old value exists:

```text
#ffaa00 -> #f6b4a6
#e09900 -> #dc8c6b
rgba(255, 170, 0, 0.12) -> rgba(246, 180, 166, 0.14)
rgba(255, 170, 0, 0.18) -> rgba(246, 180, 166, 0.2)
rgba(255, 170, 0, 0.2) -> rgba(246, 180, 166, 0.22)
rgba(255, 170, 0, 0.25) -> rgba(246, 180, 166, 0.28)
rgba(255, 170, 0, 0.3) -> rgba(246, 180, 166, 0.32)
rgba(255, 170, 0, 0.4) -> rgba(246, 180, 166, 0.42)
```

If a match is part of a component where the surrounding code already uses `var(--brand-gold)`, prefer the variable over another literal:

```css
background: var(--brand-gold);
```

For `.hero-join-btn`, the final rules should be:

```css
.hero-join-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  background: var(--brand-gold);
  color: var(--theme-text-button);
  box-shadow: 0 4px 12px rgba(246, 180, 166, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.hero-join-btn:hover {
  transform: translateY(-1px);
  background: var(--brand-gold-hover);
  box-shadow: 0 4px 16px rgba(246, 180, 166, 0.28);
}
```

- [ ] **Step 4: Add homepage hero and MIK monument CSS**

Add this focused block near the existing homepage/hero-related CSS in `src/app/globals.css`:

```css
.home-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgba(246, 180, 166, 0.16);
  border-radius: 2rem;
  background:
    radial-gradient(circle at 78% 20%, rgba(112, 172, 194, 0.34), transparent 28%),
    radial-gradient(circle at 24% 24%, rgba(246, 180, 166, 0.18), transparent 30%),
    linear-gradient(145deg, rgba(7, 16, 21, 0.94) 0%, rgba(16, 33, 42, 0.9) 48%, rgba(38, 22, 21, 0.94) 100%);
  box-shadow: 0 28px 110px rgba(0, 0, 0, 0.28);
}

.home-hero::before {
  position: absolute;
  inset: -20%;
  z-index: -1;
  background-image:
    linear-gradient(rgba(112, 172, 194, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(112, 172, 194, 0.055) 1px, transparent 1px);
  background-size: 34px 34px;
  content: "";
  mask-image: radial-gradient(circle at 72% 40%, black, transparent 72%);
}

.home-hero::after {
  position: absolute;
  right: 6%;
  bottom: 11%;
  z-index: -1;
  width: min(32rem, 58vw);
  height: 8rem;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(246, 180, 166, 0.24), transparent 70%);
  content: "";
  filter: blur(18px);
}

.home-hero__content {
  position: relative;
  display: grid;
  min-height: min(72vh, 43rem);
  grid-template-columns: minmax(0, 1fr) minmax(22rem, 0.92fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: center;
  padding: clamp(2rem, 6vw, 4.75rem);
}

.home-hero__copy {
  position: relative;
  z-index: 2;
  max-width: 42rem;
  animation: homeHeroRise 700ms ease both;
}

.home-hero__badge {
  border-color: rgba(112, 172, 194, 0.34);
  background: rgba(112, 172, 194, 0.09);
  color: var(--theme-accent-blue-strong);
}

.home-hero__title {
  color: var(--theme-text-primary);
  text-shadow: 0 20px 70px rgba(0, 0, 0, 0.34);
}

.home-hero__description {
  max-width: 35rem;
  color: var(--theme-text-secondary);
}

.home-hero__actions {
  animation: homeHeroRise 760ms 120ms ease both;
}

.home-hero__notice {
  max-width: 34rem;
  color: var(--theme-text-muted);
}

.home-hero__visual {
  position: relative;
  z-index: 1;
  min-height: clamp(18rem, 38vw, 31rem);
  animation: homeMikReveal 900ms 140ms ease both;
}

.home-mik-monument {
  position: absolute;
  inset: 0;
  transform: translateX(2%) rotate(-3deg) skew(-7deg);
}

.home-mik-monument__fill,
.home-mik-monument__stroke {
  position: absolute;
  right: max(-5rem, -8vw);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(8.5rem, 18vw, 18.5rem);
  font-weight: 900;
  letter-spacing: -0.2em;
  line-height: 0.76;
  white-space: nowrap;
}

.home-mik-monument__fill {
  top: 18%;
  color: rgba(246, 180, 166, 0.96);
  text-shadow:
    0 0 34px rgba(246, 180, 166, 0.35),
    0 32px 100px rgba(0, 0, 0, 0.55);
}

.home-mik-monument__stroke {
  top: 34%;
  color: transparent;
  opacity: 0.86;
  -webkit-text-stroke: 1.4px rgba(112, 172, 194, 0.56);
  text-stroke: 1.4px rgba(112, 172, 194, 0.56);
}

.home-mik-monument__orbit {
  position: absolute;
  top: 10%;
  right: 4%;
  width: min(26rem, 56vw);
  height: min(18rem, 34vw);
  border: 1px solid rgba(112, 172, 194, 0.18);
  border-radius: 50%;
  box-shadow: 0 0 80px rgba(112, 172, 194, 0.1);
  transform: rotate(-18deg);
}

.home-mik-monument__glow {
  position: absolute;
  right: 15%;
  bottom: 18%;
  width: min(18rem, 42vw);
  height: 6rem;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(246, 180, 166, 0.23), transparent 70%);
  filter: blur(10px);
}

.home-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
  margin-top: clamp(1.25rem, 3vw, 2rem);
  margin-bottom: clamp(2.5rem, 6vw, 5rem);
}

.home-feature-card {
  height: 100%;
  border-radius: 1.5rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025));
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.16);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.home-feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
}

.home-feature-card--coral {
  border-color: rgba(246, 180, 166, 0.22);
  background: linear-gradient(180deg, rgba(246, 180, 166, 0.13), rgba(255, 255, 255, 0.035));
}

.home-feature-card--aqua {
  border-color: rgba(112, 172, 194, 0.22);
  background: linear-gradient(180deg, rgba(112, 172, 194, 0.14), rgba(255, 255, 255, 0.035));
}

@keyframes homeHeroRise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes homeMikReveal {
  from {
    opacity: 0;
    transform: translateX(24px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

- [ ] **Step 5: Add responsive and reduced-motion CSS**

Add this block immediately after the CSS from Step 4:

```css
@media (max-width: 1024px) {
  .home-hero__content {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.55fr);
    gap: 1.5rem;
  }

  .home-mik-monument__fill,
  .home-mik-monument__stroke {
    right: -6rem;
    font-size: clamp(7rem, 19vw, 12rem);
  }
}

@media (max-width: 768px) {
  .home-hero {
    border-radius: 1.5rem;
  }

  .home-hero__content {
    min-height: 36rem;
    grid-template-columns: 1fr;
    padding: 2rem 1.25rem;
  }

  .home-hero__copy {
    max-width: none;
  }

  .home-hero__actions {
    align-items: stretch;
  }

  .home-hero__actions .hero-join-btn,
  .home-hero__actions a {
    justify-content: center;
  }

  .home-hero__visual {
    position: absolute;
    inset: 0;
    z-index: 0;
    min-height: 0;
    opacity: 0.34;
    pointer-events: none;
  }

  .home-mik-monument {
    transform: translateX(10%) translateY(6%) rotate(-3deg) skew(-7deg);
  }

  .home-mik-monument__fill,
  .home-mik-monument__stroke {
    top: 42%;
    right: -5.5rem;
    font-size: clamp(7rem, 32vw, 10rem);
  }

  .home-mik-monument__stroke {
    top: 52%;
  }

  .home-feature-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-hero__copy,
  .home-hero__actions,
  .home-hero__visual {
    animation: none;
  }

  .home-feature-card,
  .home-feature-card:hover,
  .hero-join-btn,
  .hero-join-btn:hover {
    transform: none;
  }
}
```

- [ ] **Step 6: Run CSS and type checks for this task**

Run:

```bash
bun check
```

Expected: `biome check`, TypeScript, and wiki checks pass.

If the command fails with `bun: command not found`, record that Bun is not available in the current shell and run this fallback syntax check instead:

```bash
npx biome check src/app/globals.css
```

Expected fallback result: Biome reports no formatting/lint errors for `src/app/globals.css`.

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add src/app/globals.css
git commit -m "style(home): update redesign palette and hero styles"
```

Expected: A local commit containing only `src/app/globals.css` changes.

---

### Task 2: Update animated site background colors

**Files:**
- Modify: `src/site/background/ui/site-background.tsx`

**Interfaces:**
- Consumes: Existing `LIGHT_SPOTS` constant and existing `SiteBackground` animation implementation.
- Produces: The same exported `SiteBackground` component with updated visual color spots.

- [ ] **Step 1: Inspect the current background light spot constant**

Run:

```bash
rg -n "LIGHT_SPOTS|gold|green|purple|rgba" src/site/background/ui/site-background.tsx
```

Expected: The command shows the current `LIGHT_SPOTS` entries with `gold`, `green`, and `purple` IDs.

- [ ] **Step 2: Replace `LIGHT_SPOTS` with approved palette spots**

In `src/site/background/ui/site-background.tsx`, replace the entire `LIGHT_SPOTS` constant with:

```ts
const LIGHT_SPOTS = [
  {
    id: 'coral',
    color: 'rgba(246, 180, 166, 0.17)',
    degree: 0,
    size: '46vmax',
  },
  {
    id: 'aqua',
    color: 'rgba(112, 172, 194, 0.16)',
    degree: 120,
    size: '42vmax',
  },
  {
    id: 'clay',
    color: 'rgba(220, 140, 107, 0.15)',
    degree: 240,
    size: '50vmax',
  },
] as const;
```

Do not edit `ROTATION_DEGREES_PER_SECOND`, `updateLight`, the `requestAnimationFrame` loop, or any reduced-motion code.

- [ ] **Step 3: Run targeted check for this task**

Run:

```bash
bun check
```

Expected: Project checks pass.

If the command fails with `bun: command not found`, record that Bun is not available in the current shell and run:

```bash
npx tsc --noEmit -p tsconfig.check.json
```

Expected fallback result: TypeScript reports no errors from `src/site/background/ui/site-background.tsx`.

- [ ] **Step 4: Commit Task 2**

Run:

```bash
git add src/site/background/ui/site-background.tsx
git commit -m "style(site): update immersive background palette"
```

Expected: A local commit containing only `src/site/background/ui/site-background.tsx` changes.

---

### Task 3: Restructure homepage hero and move feature cards

**Files:**
- Modify: `src/modules/home/ui/home-page.tsx`

**Interfaces:**
- Consumes: CSS classes produced by Task 1.
- Consumes: Existing translations from `next-intl` through the same `t('home.hero.*')` and `t('home.features.*')` keys.
- Produces: The same default async `HomePage()` export used by `src/app/[locale]/page.tsx`.

- [ ] **Step 1: Inspect the current homepage component structure**

Run:

```bash
rg -n "Hero Section|HomeLiveOverview|Features|home\.hero|home\.features|ScrollReveal" src/modules/home/ui/home-page.tsx
```

Expected: The command shows the current centered hero, `HomeLiveOverview`, and feature section order.

- [ ] **Step 2: Replace the hero markup with two-column hero markup**

In `src/modules/home/ui/home-page.tsx`, replace the current hero block starting at the comment `/* ── Hero Section` and ending before the `HomeLiveOverview` comment with this markup:

```tsx
          {/* ── Hero Section (SSR — 立即渲染，直接改善 LCP) ── */}
          <section className="home-hero mb-6 sm:mb-8" aria-labelledby="home-hero-title">
            <div className="home-hero__content">
              <div className="home-hero__copy">
                <div className="home-hero__badge mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--theme-accent-blue)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--theme-accent-blue)]" />
                  </span>
                  {t('home.hero.badge')}
                </div>

                <h1
                  id="home-hero-title"
                  className="home-hero__title mb-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
                >
                  {t('home.hero.title')}
                </h1>

                <p className="home-hero__description mb-8 text-lg leading-relaxed sm:text-xl">
                  {t('home.hero.description')}
                </p>

                <div className="home-hero__actions mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="https://qm.qq.com/q/gNK1JUSr0Q"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-join-btn px-8 py-4 text-base font-bold sm:text-lg"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    <span>{t('home.hero.joinButton')}</span>
                  </a>
                </div>

                <div className="home-hero__notice flex items-start gap-3 rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)] p-4 backdrop-blur-sm">
                  <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--theme-accent-blue)]" />
                  <p className="text-sm leading-relaxed">{t('home.hero.notice')}</p>
                </div>
              </div>

              <div className="home-hero__visual" aria-hidden="true">
                <div className="home-mik-monument">
                  <div className="home-mik-monument__orbit" />
                  <div className="home-mik-monument__glow" />
                  <div className="home-mik-monument__fill">MIK</div>
                  <div className="home-mik-monument__stroke">MIK</div>
                </div>
              </div>
            </div>
          </section>
```

Keep the `href`, `target`, `rel`, and all `t(...)` keys exactly as shown.

- [ ] **Step 3: Move the feature cards above `HomeLiveOverview`**

Still in `src/modules/home/ui/home-page.tsx`, place the feature section immediately after the hero section and before the `HomeLiveOverview` comment.

The feature section should be:

```tsx
          {/* ── Features (SSR — 静态文字，无需 JS) ── */}
          <div className="home-feature-grid">
            <ScrollReveal direction="left" delay={0.1}>
              <div className="home-feature-card home-feature-card--coral group border p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(246,180,166,0.14)] transition-colors group-hover:bg-[rgba(246,180,166,0.22)]">
                  <Zap className="h-6 w-6 text-[var(--brand-gold)]" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-[var(--theme-text-primary)]">
                  {t('home.features.creativeFreedom.title')}
                </h3>
                <p className="leading-relaxed text-[var(--theme-text-secondary)]">
                  {t('home.features.creativeFreedom.description')}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.1}>
              <div className="home-feature-card home-feature-card--aqua group border p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(112,172,194,0.14)] transition-colors group-hover:bg-[rgba(112,172,194,0.22)]">
                  <Award className="h-6 w-6 text-[var(--theme-accent-blue)]" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-[var(--theme-text-primary)]">
                  {t('home.features.curatedCommunity.title')}
                </h3>
                <p className="leading-relaxed text-[var(--theme-text-secondary)]">
                  {t('home.features.curatedCommunity.description')}
                </p>
              </div>
            </ScrollReveal>
          </div>
```

- [ ] **Step 4: Keep live overview after feature cards**

Immediately after the feature section from Step 3, keep the dynamic client section:

```tsx
          {/* ── Dynamic Client Section: Stats + Announcements ── */}
          <HomeLiveOverview />
```

Remove the old feature section from below `HomeLiveOverview` so the feature cards appear only once.

- [ ] **Step 5: Confirm imports still match usage**

At the top of `src/modules/home/ui/home-page.tsx`, the import list should still be:

```tsx
import { Award, MessageCircle, Play, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import HomeLiveOverview from '@/modules/home/ui/home-live-overview';
import ScrollReveal from '@/shared/ui/motion/scroll-reveal';
```

Expected: No new imports are needed; no existing imported icon is unused.

- [ ] **Step 6: Run targeted project check for this task**

Run:

```bash
bun check
```

Expected: Project checks pass.

If the command fails with `bun: command not found`, record that Bun is not available in the current shell and run these fallback checks:

```bash
npx biome check src/modules/home/ui/home-page.tsx
npx tsc --noEmit -p tsconfig.check.json
```

Expected fallback result: Biome and TypeScript report no errors.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add src/modules/home/ui/home-page.tsx
git commit -m "feat(home): add immersive mik hero"
```

Expected: A local commit containing only `src/modules/home/ui/home-page.tsx` changes.

---

### Task 4: Final visual and acceptance verification

**Files:**
- Verify: `src/modules/home/ui/home-page.tsx`
- Verify: `src/app/globals.css`
- Verify: `src/site/background/ui/site-background.tsx`

**Interfaces:**
- Consumes: Completed Tasks 1 through 3.
- Produces: Verified redesign ready for review.

- [ ] **Step 1: Verify no old main visual gold remains in changed files**

Run:

```bash
rg -n "#ffaa00|#e09900|255, 170, 0|gold|green|purple" src/modules/home/ui/home-page.tsx src/app/globals.css src/site/background/ui/site-background.tsx
```

Expected: No old hard-coded `#ffaa00`, `#e09900`, or `rgba(255, 170, 0, ...)` remains. The variable names `--brand-gold`, `--brand-gold-hover`, or comments mentioning old names may remain only if they are existing compatibility tokens and point to the new coral/clay values.

- [ ] **Step 2: Verify homepage copy keys are preserved**

Run:

```bash
rg -n "home\.hero\.(badge|title|description|joinButton|notice)|home\.features\.(creativeFreedom|curatedCommunity)\.(title|description)" src/modules/home/ui/home-page.tsx
```

Expected: All these keys are present exactly once except parent keys that naturally include multiple nested matches:

```text
home.hero.badge
home.hero.title
home.hero.description
home.hero.joinButton
home.hero.notice
home.features.creativeFreedom.title
home.features.creativeFreedom.description
home.features.curatedCommunity.title
home.features.curatedCommunity.description
```

- [ ] **Step 3: Verify section order in the homepage file**

Run:

```bash
rg -n "Hero Section|Features|Dynamic Client Section|HomeLiveOverview" src/modules/home/ui/home-page.tsx
```

Expected order by line number:

```text
Hero Section
Features
Dynamic Client Section
HomeLiveOverview
```

- [ ] **Step 4: Run official project verification**

Run:

```bash
bun check
```

Expected: Official check passes.

If it fails with `bun: command not found`, do not claim full verification. Record this exact limitation and run fallback checks:

```bash
npx biome check src/modules/home/ui/home-page.tsx src/app/globals.css src/site/background/ui/site-background.tsx
npx tsc --noEmit -p tsconfig.check.json
```

Expected fallback result: Biome and TypeScript pass, with the note that official `bun check` still needs to be run after Bun is available in PATH.

- [ ] **Step 5: Optional manual visual check if Bun is available**

Run:

```bash
bun dev
```

Expected: Next.js dev server starts and prints a local URL such as `http://localhost:3000`.

Open the homepage and verify:

```text
1. Desktop: hero is two-column, left copy is readable, right MIK is large and partially poster-like.
2. Desktop: feature cards appear below hero and above live overview/announcements.
3. Mobile width: MIK becomes a low-opacity background layer and does not obscure text or CTA.
4. Theme: coral/aqua/clay palette appears in hero, buttons, feature cards, background lights, and hover states.
5. Reduced motion: with prefers-reduced-motion enabled, new entrance animations and hover translations do not play.
```

Stop the dev server with `Ctrl+C` after checking.

- [ ] **Step 6: Commit final verification note if any fixes were needed**

If Step 4 or Step 5 required code fixes, commit those fixes:

```bash
git add src/modules/home/ui/home-page.tsx src/app/globals.css src/site/background/ui/site-background.tsx
git commit -m "fix(home): polish redesign verification issues"
```

Expected: No commit is created if no fixes were needed.

---

## Self-Review

**Spec coverage:**
- Hero becomes more immersive and visually striking: Task 1 and Task 3.
- Existing copy and i18n keys preserved: Task 3 and Task 4 Step 2.
- Feature cards moved under hero and before live overview: Task 3 and Task 4 Step 3.
- New palette replaces old gold visual direction: Task 1, Task 2, and Task 4 Step 1.
- Right visual uses `MIK` letters, not icons/assets: Task 3.
- No external font CDN, images, Canvas, WebGL, or new dependencies: Global Constraints and all tasks.
- Responsive and reduced-motion behavior: Task 1 Step 5 and Task 4 Step 5.
- Background lights changed to coral/aqua/clay while keeping mechanism: Task 2.
- Official project check: Task 4 Step 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, or unspecified edge-case instructions remain in this plan.

**Type consistency:** All CSS class names produced in Task 1 match class names consumed in Task 3. `HomePage()` remains the default export consumed by `src/app/[locale]/page.tsx`.
