# Architecture

## Purpose
This document explains the post-migration architecture of the game runtime and the reasoning behind the current module boundaries.

The project moved from a single large runtime file to a layered OOP structure focused on:
- behavior parity and deterministic gameplay
- strict dependency direction
- easier feature extension (especially gameplay mechanics like portals)
- testability of domain logic independent of browser rendering

## High-Level Summary
The runtime is now composed from small, explicit systems operating on a shared `WorldState`.

Entrypoint flow:
1. `src/main.ts` creates a game instance through `createPacmanGame`.
2. `createPacmanGame` builds a `GameRuntime` with `GameCompositionRoot`.
3. `GameCompositionRoot` wires map/assets/adapters/domain services/systems.
4. `GameRuntime` drives ordered updates and rendering via fixed-step loop.

## Directory Layout
```text
src/game/
  app/
    createPacmanGame.ts
    GameRuntime.ts
    GameCompositionRoot.ts
    contracts.ts
  domain/
    entities/
    valueObjects/
    world/
    services/
  systems/
  infrastructure/
    map/
    assets/
    adapters/
  shared/
    random/
    events/
```

## Layer Responsibilities

### `app`
Composition and lifecycle orchestration.
- `createPacmanGame.ts`: public API factory (`start`, `pause`, `resume`, `destroy`).
- `GameRuntime.ts`: fixed-step runtime loop and system execution.
- `GameCompositionRoot.ts`: composition root; builds world + systems + adapters.
- `contracts.ts`: runtime and system interfaces.

### `domain`
Gameplay model and pure logic.
- `entities`: `PacmanEntity`, `GhostEntity`.
- `valueObjects`: `Direction`, `TilePosition`, `MovementProgress`.
- `world`: `WorldState`, `CollisionGrid`, map/world data types.
- `services`: movement rules, ghost decisions, ghost jail behavior, portal behavior.

### `systems`
Frame-by-frame behavior execution.
- `InputSystem`
- `PacmanMovementSystem`
- `GhostReleaseSystem`
- `GhostMovementSystem`
- `AnimationSystem`
- `CameraSystem`
- `HudSystem`
- `DebugOverlaySystem`
- `RenderSystem`

### `infrastructure`
Browser/engine integration and data loading.
- map parser/repository (`TiledParser`, `TiledMapRepository`)
- assets (`AssetCatalog`)
- adapters for renderer/input/timer/hud

### `shared`
Cross-cutting utilities.
- `RandomSource` and `SeededRandom` for deterministic behavior
- generic event bus used by state/UI integration

## Dependency Direction (Enforced)
Allowed direction:
1. `app` -> `systems`, `domain`, `infrastructure`, `shared`, `engine`
2. `systems` -> `domain`, `shared`, and infrastructure adapters/assets
3. `domain` -> `shared`
4. `infrastructure` -> `domain`, `shared`, `engine`
5. no circular imports

Automated in `scripts/arch-check.mjs`.

## Runtime Update and Render Order
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
1. `RenderSystem` map
2. `RenderSystem` entities
3. `DebugOverlaySystem` overlay
4. HUD is DOM-based (managed by `HudSystem`/adapter)

## Camera Behavior Contract
- `CameraSystem.start()` configures bounds, zoom, follow target, and viewport, then calls a one-time snap so the first gameplay frame is centered on Pac-Man instead of animating in from `(0, 0)`.
- After startup, camera movement remains lerp-based via `CAMERA.followLerp` and updates each frame in `CameraSystem.update()`.
- `Camera2D` clamps camera coordinates to world bounds on both startup snap and regular updates.
- Resize handling updates renderer size and camera viewport dimensions before subsequent follow updates.
- Regression coverage lives in `src/__tests__/camera2d.test.ts` and `src/__tests__/cameraSystem.test.ts`.

## Core Runtime Contracts
Public runtime contract:
- `start(): Promise<void>`
- `pause(): void`
- `resume(): void`
- `destroy(): void`

The previous `startGameApp`/`stopGameApp` API was intentionally removed.

## State and Data Flow
- `TiledMapRepository` loads and parses maze JSON into `WorldMapData`.
- `CollisionGrid` exposes safe tile/collision reads.
- `WorldState` stores runtime mutable state (entities, debug flags, tick, jail state, animation state).
- Systems mutate `WorldState` in order; render systems consume the latest state.

## Determinism and Randomness
All game randomness is routed through `RandomSource`.
- production can use `Math.random`
- tests use `SeededRandom` for deterministic simulations

## Portals
Portal behavior is encapsulated in `PortalService`:
- teleports only at tile center (`moved.x === 0 && moved.y === 0`)
- prevents same-tick bounce via per-entity tick guard
- blocks teleport if destination portal tile is fully blocking

Covered by `src/__tests__/portalService.test.ts`.

## Quality Gates
Required checks:
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run arch:check`
- `pnpm run size:check`

Additional constraints:
- no cycles, no layer boundary violations (`arch-check`)
- TypeScript file line caps (default 350; parser override 450) (`size-check`)

## Migration Notes
Legacy files removed:
- `src/game/startGameApp.ts`
- `src/types.ts`
- `src/movement.ts`
- `src/game/map/tiled.ts`
- `src/game/runtime/ghostSimulation.ts`
- `src/game/ui/HudOverlay.ts`

Equivalent behavior now exists in domain services/systems/infrastructure adapters.

## Troubleshooting
If you see a blank page after changes:
1. run `pnpm run typecheck`
2. run `pnpm run build`
3. check browser console for module import errors
4. ensure type-only symbols are imported/exported with `import type` / `export type`
