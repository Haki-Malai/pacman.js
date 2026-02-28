## 1. PR3 Subset Integration Setup

- [x] 1.1 Capture PR3 source commit window (`c3a5ff7..b0e5498`) and map each touched file to keep/adapt/skip decisions for current `main`
- [x] 1.2 Execute cherry-pick-and-adapt baseline for PR3-only gameplay slices, explicitly excluding PR1/PR2 scope
- [x] 1.3 Translate any legacy root-spec edits in source commits into OpenSpec-aligned updates only (no `SPECIFICATIONS.md` authority restore)

## 2. Collectible Progression Implementation

- [x] 2.1 Implement `PointLayoutService` with deterministic reachable-topology layout and void-leak exclusion rules
- [x] 2.2 Implement `CollectibleSystem` for spawn state, centered consumption gating, score updates, and finite eat effects
- [x] 2.3 Wire collectible flow into runtime (`GameCompositionRoot`, `RenderSystem`, `WorldState`, `PacmanEntity`, `constants.ts`, `AssetCatalog`)

## 3. Jail Release, Pause, and Blink Feedback

- [x] 3.1 Update ghost release staging to use base delay plus per-ghost interval cadence
- [x] 3.2 Implement lane alignment and deterministic tie-break handling with optional preferred-direction support in jail release path
- [x] 3.3 Implement pause overlay + paused scene treatment and post-portal Pac-Man blink timer behavior compatible with current CSS/runtime stack

## 4. Tests and Mechanics Contract Reconciliation

- [x] 4.1 Add/update unit tests for `pointLayoutService`, `pacmanMovementSystem`, and `renderSystem` behavior branches introduced by PR3
- [x] 4.2 Expand mechanics coverage for ghost release cadence/alignment edge cases and pause/blink feedback paths
- [x] 4.3 Update `tests/specs/mechanics.spec.json` and mechanics contract test IDs for `MEC-ANI-002`, `MEC-PAUSE-003`, and `MEC-POINT-001/002/003`

## 5. Validation and Apply Readiness

- [x] 5.1 Run `pnpm run typecheck`
- [x] 5.2 Run `pnpm run lint`
- [x] 5.3 Run `pnpm run test`
- [x] 5.4 Run `pnpm run spec:check`
- [x] 5.5 Confirm `openspec status --change "merge-pr3-collectibles-ghost-release" --json` reports required artifact `tasks` as `done`
