## Why

Current ghost jail exit behavior uses tween-based alignment/exit and global ghost pen-gate bypass rules that allow free ghosts to keep crossing the jail gate. This causes release motion to feel less predictable and can produce wall-overlap visuals during tween transitions.

## What Changes

- Replace tween-based jail release with deterministic phase-based release movement that uses normal tile movement and collision checks.
- Keep staged release timing (base delay + per-ghost interval) so ghosts still leave jail one-by-one.
- Introduce deterministic side-staged release path: each release first moves to a side-center jail tile (`minX`/`maxX`) with alternating left/right order.
- Restrict pen-gate bypass to release traversal only, so free ghosts cannot repeatedly pass through the upper jail gate.
- Preserve ghost movement speed during release and ensure release traversal remains collision-valid (no wall overlap from tweens).
- Add/adjust movement and mechanics tests for single-pass gate behavior, side alternation, and release-path collision safety.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `jail-release-and-pause-feedback`: Ghost jail release path and gate traversal behavior are updated to deterministic side-staged, single-pass release movement while preserving staggered cadence.

## Impact

- Affected code:
  - `src/game/domain/valueObjects/Direction.ts`
  - `src/game/domain/services/MovementRules.ts`
  - `src/game/systems/GhostReleaseSystem.ts`
  - `src/game/systems/GhostMovementSystem.ts`
  - `src/game/domain/services/GhostJailService.ts` (release-target helpers if needed)
- Affected tests:
  - `src/__tests__/movement.test.ts`
  - `src/__tests__/mechanics/systemsCoverage.mechanics.test.ts`
  - `src/__tests__/mechanics/ghostJailAndRelease.mechanics.test.ts`
  - mechanics scenario catalog/contract files under `tests/specs/` and `src/__tests__/mechanics.spec.contract.test.ts`
- No external runtime API changes (`createPacmanGame` contract remains unchanged).
