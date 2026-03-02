## Why

Portal transfer currently occurs too early in the movement phase, which makes endpoint traversal feel abrupt and inconsistent with visible movement progress. We need portal timing that is deterministic, direction-aware, and delayed until outward motion is materially underway.

## What Changes

- Delay portal transfer from center/immediate behavior to outward-progress behavior.
- Require explicit entity direction and outward-direction match for portal transfer.
- Trigger transfer only when outward movement offset reaches at least half a tile (`>= tileSize / 2`).
- Add a portal-edge movement override so entities can start outward motion from blocked portal endpoints without leaking into void.
- Allow Pac-Man to apply a buffered turn into a portal endpoint's outward direction while centered, even when normal collision checks would block that turn.
- Preserve existing same-tick teleport bounce guard.
- Preserve existing destination full-block rejection rule.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `jail-release-and-pause-feedback`: post-portal behavior now includes delayed half-tile outward trigger semantics, direction-required transfer, and no-leak outward progression before transfer.

## Impact

- Affected runtime systems:
  - `src/game/domain/services/PortalService.ts`
  - `src/game/systems/PacmanMovementSystem.ts`
  - `src/game/systems/GhostMovementSystem.ts`
- Affected tests/spec catalogs:
  - `src/__tests__/portalService.test.ts`
  - `src/__tests__/mechanics/portal.mechanics.test.ts`
  - `src/__tests__/mechanics/fuzzInvariants.mechanics.test.ts`
  - `src/__tests__/pacmanMovementSystem.test.ts`
  - `src/__tests__/mechanics/systemsCoverage.mechanics.test.ts`
  - `tests/specs/mechanics.spec.json`
- Affected docs/spec artifacts:
  - `docs/ARCHITECTURE.md`
  - `openspec/changes/delay-portal-teleport-half-tile/specs/jail-release-and-pause-feedback/spec.md`
