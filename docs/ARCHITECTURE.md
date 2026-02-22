# Architecture

## Purpose

This document explains the runtime architecture after the modernization + legacy-menu migration.

The project now uses a **two-layer runtime model**:

1. **UI shell layer** (`src/ui`) for launch/menu flow and product-facing chrome.
2. **Gameplay runtime layer** (`src/game`) for deterministic fixed-step mechanics.

This separation keeps product UX changes (menu, shell, HUD styling) independent from gameplay systems.

---

## High-level flow

1. `src/main.ts` creates a `PacmanExperience` shell.
2. `PacmanExperienceRuntime` mounts a runtime host + overlay host.
3. `LegacyMenuController` runs intro/menu animations and waits for START.
4. On START, shell composes and starts the gameplay runtime through `createPacmanGame`.
5. Overlay/menu is removed, gameplay continues in Canvas2D with DOM HUD.

---

## Directory layout

```text
src/
  ui/
    menu/
      LegacyMenuController.ts
    shell/
      PacmanExperienceRuntime.ts
      createPacmanExperience.ts
      contracts.ts

  game/
    app/
    domain/
    systems/
    infrastructure/
    shared/

  engine/
  style.css
```

---

## Layer responsibilities

### `ui` (product shell)

- Bootstraps launch UX (legacy intro/menu).
- Controls when gameplay runtime is allowed to start.
- Handles menu action affordances (start/options/exit placeholder behavior).
- Owns Tailwind-driven menu styling hooks.

### `game/app` (composition + lifecycle)

- Builds world/services/systems (`GameCompositionRoot`).
- Owns fixed-step orchestration (`GameRuntime`).
- Exposes runtime API (`start`, `pause`, `resume`, `destroy`).

### `game/domain`

- Pure gameplay entities/value objects/world model/services.

### `game/systems`

- Ordered frame update behavior (input, movement, animation, camera, hud, debug).

### `game/infrastructure`

- Browser/map/assets adapters and parser/repository components.

### `engine`

- Reusable low-level runtime primitives.

---

## Runtime ordering

Update order (fixed):

1. `InputSystem`
2. `PacmanMovementSystem`
3. `GhostReleaseSystem`
4. `GhostMovementSystem`
5. `AnimationSystem`
6. `CameraSystem`
7. `HudSystem`
8. `DebugOverlaySystem`

Render order:

1. `RenderSystem` world + entities
2. `DebugOverlaySystem`
3. `HudSystem` (DOM overlay adapter)

---

## Styling architecture

- Tailwind CSS is integrated via PostCSS (`tailwind.config.cjs`, `postcss.config.cjs`).
- `src/style.css` contains:
    - Tailwind base/components/utilities layers
    - local `@font-face` setup (Orbitron)
    - custom keyframes/classes for legacy-style menu transitions
    - HUD visual classes

Gameplay rendering remains Canvas2D; Tailwind is used for DOM shell/HUD layers.

---

## Guardrails

- `scripts/arch-check.mjs` enforces `src/game` layer direction and no circular deps.
- `scripts/size-check.mjs` enforces TypeScript file line caps.
- Required checks:
    - `pnpm typecheck`
    - `pnpm lint`
    - `pnpm test`
    - `pnpm arch:check`
    - `pnpm size:check`
    - `pnpm build`
