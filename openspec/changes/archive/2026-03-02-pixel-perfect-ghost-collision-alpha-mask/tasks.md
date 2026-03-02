## 1. Collision Domain Rewrite

- [x] 1.1 Replace tile-based contact detection in `GhostPacmanCollisionService` with alpha-mask overlap detection and deterministic first-hit selection
- [x] 1.2 Update collision service types (`CollisionMaskFrame`, `CollisionMaskSample`, candidate inputs, and contact type) to support frame-aware transform-aware mask checks
- [x] 1.3 Remove tile-crossing/same-tile helpers and obsolete previous-tile collision dependencies

## 2. Runtime Integration

- [x] 2.1 Add sprite frame mask caching API to `AssetCatalog` (`getSpriteMask`) using nearest-neighbor rasterization and `alpha > 0` threshold
- [x] 2.2 Add a shared ghost render-key resolver and use it in both rendering and collision paths
- [x] 2.3 Update `GhostPacmanCollisionSystem` and `GameCompositionRoot` to build per-tick mask samples and run pixel-mask collision detection
- [x] 2.4 Remove `pacmanPreviousTile` and `ghostPreviousTiles` from world/movement systems

## 3. Tests and Mechanics Contracts

- [x] 3.1 Rewrite collision service unit tests for mask overlap, transform effects, deterministic ordering, and non-overlap tile swaps
- [x] 3.2 Update collision system tests for new detection semantics while preserving outcome policy
- [x] 3.3 Update mechanics life-loss scenarios/spec catalog entries to reflect pixel-mask behavior

## 4. Validation and OpenSpec Checks

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
