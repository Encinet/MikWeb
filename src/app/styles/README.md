# App Styles

`src/app/globals.css` is the only global stylesheet imported by the root layout. Keep it as an import manifest and place rules in the closest scoped file here.

- `base/`: design tokens, document defaults, native element defaults, global animations.
- `layout/`: viewport-safe layout helpers.
- `shared/`: reusable UI primitives and shared page treatments.
- `site/`: site shell styles such as the header and footer.
- `modules/`: feature or route-level styles used by one product area.

Before adding a new global selector, prefer a component-local Tailwind class. Use these files for selectors that must be shared across components or are driven by server-rendered content.
