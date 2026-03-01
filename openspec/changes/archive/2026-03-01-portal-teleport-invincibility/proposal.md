## Why

Portal teleport currently triggers only a visual blink, so Pac-Man can still lose a life immediately after teleporting into a ghost. That breaks player expectation for a brief safe transition and makes portal exits feel unfair.

## What Changes

- Reuse the existing post-portal blink window (`PACMAN_PORTAL_BLINK.durationMs`) as a collision-shield window.
- Suppress `pacman-hit` collision outcomes while the portal blink window is active.
- Preserve `ghost-hit` outcomes during the same window so scared ghosts can still be eaten and scored.
- Keep movement and rendering behavior unchanged; blink remains the visual indicator.
- Add targeted unit/mechanics coverage and update mechanics/OpenSpec behavior contracts.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ghost-collision-life-loss`: collisions during post-portal blink now suppress non-scared (`pacman-hit`) outcomes while still allowing scared (`ghost-hit`) outcomes.
- `jail-release-and-pause-feedback`: post-portal blink requirement now includes deterministic collision-shield semantics aligned to the blink window.

## Impact

- Affected systems: `GhostPacmanCollisionSystem` only for runtime behavior.
- Affected tests: `ghostPacmanCollisionSystem.test.ts`, `lifeLoss.mechanics.test.ts`, mechanics scenario catalog/contract assertions.
- Affected OpenSpec artifacts: proposal/design/tasks and spec deltas for `ghost-collision-life-loss` and `jail-release-and-pause-feedback`.
