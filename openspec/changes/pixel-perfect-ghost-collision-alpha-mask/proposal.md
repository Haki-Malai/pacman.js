## Why

Tile-based ghost/Pac-Man collision detection is deterministic, but it does not match visible sprite contact. This causes collisions to trigger when sprites are visually separated (or miss edge cases where visible sprite pixels overlap across tile boundaries), so collision behavior should be upgraded to pixel-accurate contact.

## What Changes

- Replace tile-space ghost/Pac-Man contact checks with world-space alpha-mask overlap checks.
- Remove tile-crossing fallback collision behavior; contact is now defined by actual opaque pixel overlap only.
- Preserve existing collision outcome policy and ordering: deterministic first-ghost resolution, scared/non-scared branching, portal shield behavior, death recovery invulnerability, and one-outcome-per-tick semantics.
- Introduce sprite-frame mask extraction and caching so collision masks are derived from rendered animation frames and transforms.
- Remove obsolete previous-tile collision bookkeeping that existed only for tile-crossing detection.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ghost-collision-life-loss`: Collision detection requirements move from tile-space overlap/swap semantics to alpha-mask sprite overlap semantics.

## Impact

- Affected runtime code: `GhostPacmanCollisionService`, `GhostPacmanCollisionSystem`, `AssetCatalog`, `GameCompositionRoot`, `WorldState`, `PacmanMovementSystem`, `GhostMovementSystem`.
- Affected test coverage: collision service/system unit tests and life-loss mechanics scenarios/spec fixtures.
- Affected OpenSpec artifacts: delta spec for `ghost-collision-life-loss` and new change proposal/design/tasks documents.
