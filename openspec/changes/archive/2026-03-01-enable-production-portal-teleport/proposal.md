## Why

Portal teleportation behavior is implemented in runtime systems but production gameplay cannot trigger it because the shipped default map currently provides no resolved portal endpoints. This leaves the portal mechanic effectively disabled in normal play despite tests passing against synthetic fixtures.

## What Changes

- Add production portal objects (`portal-left`, `portal-right`) to `public/assets/mazes/default/maze.json` `Spawns` layer.
- Extend map parsing to derive portal collision endpoints from `Spawns` portal objects using deterministic nearest-walkable-tile resolution.
- Keep `PortalService` pairing/teleport logic unchanged; only enable real portal tiles in parsed production collision data.
- Add coverage for production-map portal contract and promote map-portal behavior from roadmap metadata to implemented mechanics scenario coverage.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `jail-release-and-pause-feedback`: post-portal behavior now has an explicit production map portal-source contract ensuring teleport can be triggered in default runtime map.

## Impact

- Affected data: `public/assets/mazes/default/maze.json` spawn objects.
- Affected parser/runtime: `TiledParser` portal flag derivation from spawn objects.
- Affected tests/contracts: maze contract, parser contract, mechanics portal scenarios/catalog, roadmap metadata.
