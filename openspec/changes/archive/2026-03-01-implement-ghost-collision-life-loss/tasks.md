## 1. Collision Runtime Foundations

- [x] 1.1 Add `GhostPacmanCollisionService` with same-tile and tile-crossing detection plus first-hit selection
- [x] 1.2 Extend `WorldState` with Pac-Man spawn tile and per-tick previous-tile snapshots for Pac-Man and ghosts
- [x] 1.3 Add `GhostPacmanCollisionSystem` that resolves current collision outcome as Pac-Man life loss

## 2. Runtime Integration

- [x] 2.1 Capture previous-tile snapshots in `PacmanMovementSystem` and `GhostMovementSystem` before movement updates
- [x] 2.2 Add `loseLife()` helper in game state with zero-floor clamping and lives event emission
- [x] 2.3 Wire collision system into `GameCompositionRoot` update order directly after `GhostMovementSystem`

## 3. Tests and Mechanics Contract

- [x] 3.1 Add unit tests for collision service detection branches and deterministic first-hit behavior
- [x] 3.2 Add unit tests for collision system life-loss, respawn, scared-ghost behavior, zero clamp, and one-life-per-tick handling
- [x] 3.3 Add `MEC-LIFE-001` coverage and update runtime-order mechanics harness expectations
- [x] 3.4 Promote life-loss scenario from roadmap to implemented mechanics artifacts

## 4. Documentation and Verification

- [x] 4.1 Update architecture runtime-order documentation for the added collision system
- [x] 4.2 Run required gates: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`
