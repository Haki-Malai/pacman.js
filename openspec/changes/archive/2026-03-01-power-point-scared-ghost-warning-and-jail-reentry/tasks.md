## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` with locked behavior deltas and modified capabilities
- [x] 1.2 Finalize `design.md` with scared timing, warning cadence reuse, and jail requeue decisions
- [x] 1.3 Finalize spec delta for `collectible-progression`
- [x] 1.4 Finalize spec delta for `ghost-collision-life-loss`
- [x] 1.5 Finalize spec delta for `jail-release-and-pause-feedback`

## 2. Runtime State and Constants

- [x] 2.1 Add scared timing constants and remove obsolete scared crossfade/free-delay constants
- [x] 2.2 Replace world scared crossfade state with scared timer and warning visual state maps

## 3. Gameplay Behavior

- [x] 3.1 Extend `CollectibleSystem` to trigger/refresh power-point scared windows and reset ghost chain
- [x] 3.2 Update `AnimationSystem` to progress scared timers, warning toggles, and deterministic scared expiry
- [x] 3.3 Update `RenderSystem` to draw warning-phase ghosts as blue/base alternation and remove crossfade rendering
- [x] 3.4 Update `GhostReleaseSystem` to support deterministic eaten-ghost requeue into normal release flow
- [x] 3.5 Update `GhostPacmanCollisionSystem` ghost-hit flow to use release requeue instead of delayed free-in-place
- [x] 3.6 Align `InputSystem` debug scared toggle with timer/warning state setup and clear

## 4. Tests and Specs

- [x] 4.1 Update collision/release unit tests for ghost-hit requeue behavior
- [x] 4.2 Update animation/render tests for warning alternation and crossfade removal
- [x] 4.3 Add or update collectible behavior coverage for power-point scared activation and refresh semantics
- [x] 4.4 Update mechanics scenarios (`MEC-ANI-003`, `MEC-GHO-004`) and mechanics spec expectations

## 5. Validation and Completion

- [x] 5.1 Run `pnpm run typecheck`
- [x] 5.2 Run `pnpm run lint`
- [x] 5.3 Run `pnpm run test`
- [x] 5.4 Run `pnpm run spec:check`
- [x] 5.5 Mark all tasks complete and confirm apply-ready status
