# Legacy Menu Migration Plan and Mapping

## Goal

Port the original menu/intro experience from `Games/Pac-Man JavaScript/Old` into the modern `pacman.js` codebase without reintroducing monolithic runtime code.

## Source reference

- Legacy HTML/CSS/JS selectors and animation intent were taken from:
    - `Games/Pac-Man JavaScript/Old/index.html`
    - `Games/Pac-Man JavaScript/Old/style.css`
    - `Games/Pac-Man JavaScript/Old/app.js` (intro/menu sequence around `intro` + `menu` objects)

## Migration strategy

### 1) Separate shell from gameplay runtime

- Keep gameplay runtime architecture untouched (`src/game/*`).
- Add a shell layer (`src/ui/*`) responsible for launch/menu UX and runtime gating.

### 2) Recreate legacy flow as a focused controller

- Build `LegacyMenuController` with an explicit stage state machine:
    - `idle` → click hint
    - `intro` → author intro animation
    - `menu` → Pac-Man logo + Start/Options/Exit
    - `starting` → exit animation and runtime launch

### 3) Translate visual language using Tailwind + custom keyframes

- Keep original palette and neon animation style.
- Replace legacy global CSS/jQuery animation wiring with:
    - Tailwind utility/component classes
    - scoped keyframes in `src/style.css`
    - typed DOM setup in TypeScript

### 4) Keep behavior safe and deterministic

- Runtime start is triggered only through START action.
- Existing game systems, update order, and tests remain unchanged.
- Startup errors surface as menu status messages and preserve recovery.

## Legacy-to-modern mapping (high level)

| Legacy element                           | Modern equivalent                                    |
| ---------------------------------------- | ---------------------------------------------------- |
| `#Click`                                 | `.legacy-click-hint`                                 |
| `#MyName` + letter spans                 | `.legacy-credit` + generated letter spans            |
| `#Pac`, `#Dash`, `#Man`                  | `.legacy-logo-*` sprites from `/assets/sprites`      |
| `#Start/#Options/#Exit`                  | `.legacy-menu-button--*` buttons                     |
| `menu.welcome()/menu.bye()`              | `LegacyMenuController` stage transitions + keyframes |
| direct `startGame()` call in legacy file | `PacmanExperienceRuntime.startGameRuntime()`         |

## Quality controls used

- `pnpm typecheck`
- `pnpm lint`
- `pnpm arch:check`
- `pnpm size:check`
- `pnpm test`
- `pnpm spec:check`
- `pnpm build`
