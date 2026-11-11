# App Styles

`src/app/globals.css` is the shared stylesheet imported by the root layout. Keep it as an import manifest and place rules in the closest scoped file here. Chat, Wiki, and building submission styles are imported by their route entry points so other pages do not wait for them on first load. Keep these selectors scoped to their feature because route styles remain loaded after client navigation.

- `base/`: design tokens, document defaults, native element defaults, global animations.
- `layout/`: viewport-safe layout helpers.
- `shared/`: reusable UI primitives and shared page treatments.
- `site/`: site shell styles such as the header and footer.
- `modules/`: feature or route-level styles used by one product area.

Chat styles are loaded in order: `chat.css` for the workspace layout, `chat-tools.css` for menus and activity summaries, then `chat-motion.css` for motion timing, animations, and reduced-motion support. Keep final visual states in the first two files and opt into movement in `chat-motion.css`.

Before adding a new global selector, prefer a component-local Tailwind class. Use these files for selectors that must be shared across components or are driven by server-rendered content.
