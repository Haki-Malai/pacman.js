## Why

Default runtime portal teleport currently supports only one production pair (left/right). Players expect symmetric top/bottom portal behavior in the same map, but those endpoints are not declared as production portal anchors and are therefore treated as non-portal tiles.

## What Changes

- Add two production portal spawn objects (`portal-top`, `portal-bottom`) in `public/assets/mazes/default/maze.json`.
- Add `pairId` metadata for all portal spawn objects:
  - `horizontal`: `portal-left`, `portal-right`
  - `vertical`: `portal-top`, `portal-bottom`
- Extend parser output to include deterministic explicit portal pair metadata while still setting `collision.portal` on resolved endpoint tiles.
- Update `PortalService` to consume explicit pairs when provided and keep scan/fallback pairing behavior for existing fixtures.
- Update runtime wiring, map contracts, and mechanics scenarios to validate both horizontal and vertical production portal pairs (`MEC-PORT-006`).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `jail-release-and-pause-feedback`: production portal contract is expanded from one deterministic pair to two deterministic pairs (horizontal and vertical), while preserving center-only teleport semantics, same-tick guard, and blink/shield behavior.

## Impact

- Affected data: `public/assets/mazes/default/maze.json` spawn objects.
- Affected parser/runtime: `TiledParser`, `WorldMapData`, `PortalService`, runtime composition wiring.
- Affected tests/contracts: maze contract, portal service tests, portal mechanics scenarios/catalog.
