## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` with locked behavior deltas and capability modifications
- [x] 1.2 Finalize `design.md` with collision policy, recovery timing, and jail return decisions
- [x] 1.3 Finalize spec delta for `ghost-collision-life-loss`
- [x] 1.4 Finalize spec delta for `jail-release-and-pause-feedback`

## 2. Domain and Runtime State

- [x] 2.1 Add new timing/scoring constants for death recovery, ghost eat chain, jail delay, and scared recovery crossfade
- [x] 2.2 Extend `PacmanEntity` with death recovery fields
- [x] 2.3 Extend `WorldState` with scared recovery map, ghost eat chain counter, and ghost jail return tile

## 3. Collision and Movement Behavior

- [x] 3.1 Update `GhostPacmanCollisionService` default outcome resolver to scared-aware branching
- [x] 3.2 Extend `PacmanMovementSystem` to progress deterministic death recovery blink/invulnerability timer
- [x] 3.3 Extend `GhostPacmanCollisionSystem` for invulnerability gate, pacman-hit recovery bootstrap, ghost-hit scoring+jail flow, and delayed free handles
- [x] 3.4 Wire constructor changes for collision system dependencies in composition root and mechanics harness

## 4. Animation and Rendering

- [x] 4.1 Extend `AnimationSystem` to track scared-to-normal ghost recovery transitions and lifecycle
- [x] 4.2 Extend `RenderSystem` to prioritize death recovery visibility and render ghost recovery crossfades

## 5. Tests and Mechanics Contracts

- [x] 5.1 Update collision service/system unit tests for scared outcome, invulnerability gate, ghost eat scoring, and delayed free behavior
- [x] 5.2 Update movement/animation/render tests for death recovery blink and scared recovery crossfade
- [x] 5.3 Add/adjust mechanics scenario tests for `MEC-GHO-004`, `MEC-LIFE-002`, and `MEC-ANI-003`
- [x] 5.4 Update `tests/specs/mechanics.spec.json` and remove `RD-GHOST-001` from roadmap
- [x] 5.5 Update expected mechanics/roadmap IDs in contract test files

## 6. Validation and Completion

- [x] 6.1 Run `pnpm run typecheck`
- [x] 6.2 Run `pnpm run lint`
- [x] 6.3 Run `pnpm run test`
- [x] 6.4 Run `pnpm run spec:check`
- [x] 6.5 Mark all tasks complete and confirm apply-ready status
