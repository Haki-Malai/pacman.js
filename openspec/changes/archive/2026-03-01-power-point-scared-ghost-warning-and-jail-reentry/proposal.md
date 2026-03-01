## Why

Power points currently award score but do not trigger frightened ghosts, so the expected risk/reward loop is missing. The current scared-exit visual also uses a crossfade rather than a warning blink, and eaten ghosts do not fully re-enter the normal jail wait/roam/release flow.

## What Changes

- Add power-point triggered scared state for all active ghosts for a fixed 6000ms duration.
- Add a deterministic final 1200ms warning phase where scared ghosts alternate between blue and their base color.
- Reuse Pac-Man death-recovery blink cadence progression for ghost warning alternation timing.
- Keep existing update order; power-point scared activation begins on the next tick after consumption.
- Change scared ghost eat behavior to teleport the ghost to jail return and requeue it into the existing jail wait/roam/release pipeline.
- Remove scared-exit crossfade behavior and align debug scared toggle (`KeyH`) with the new scared timer/warning model.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `collectible-progression`: power-point consumption now starts frightened-ghost timing behavior, not just score/eat feedback.
- `ghost-collision-life-loss`: ghost-hit outcome now returns eaten ghosts through standard jail release lifecycle instead of delayed free-in-place.
- `jail-release-and-pause-feedback`: replace scared-exit crossfade requirement with deterministic scared warning blue/base alternation.

## Impact

- Affected systems: `CollectibleSystem`, `AnimationSystem`, `RenderSystem`, `GhostPacmanCollisionSystem`, `GhostReleaseSystem`, `InputSystem`.
- Affected domain/runtime state: ghost scared timing/warning state in `WorldState` and related constants.
- Affected tests/contracts: unit tests for collectible, animation, render, collision, release; mechanics scenarios `MEC-ANI-003` and `MEC-GHO-004`; OpenSpec capability deltas.
