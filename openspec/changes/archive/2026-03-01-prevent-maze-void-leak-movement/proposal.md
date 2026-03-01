## Why

Portal teleport is now active in production, but entities can still leak outside playable maze space through `gid:null`/void edge cells near portals. This creates out-of-bounds traversal behavior that violates expected maze boundaries.

## What Changes

- Harden collision boundary lookups so out-of-bounds reads are treated as blocking.
- Parse void map cells (`gid <= 0`) as non-traversable collision tiles in runtime map data.
- Add regression coverage for portal endpoint outward input to ensure teleport resolves without leaking into void.
- Expand mechanics/catalog contract coverage for the new no-leak behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `gameplay-contract`: runtime traversal boundaries now explicitly prevent entering map void or out-of-bounds space.
- `jail-release-and-pause-feedback`: portal endpoint behavior now explicitly guarantees no void-leak while keeping portal teleport flow active.

## Impact

- Affected domain world behavior: collision grid out-of-bounds tile semantics.
- Affected parser/runtime behavior: void tile collision mapping in `TiledParser`.
- Affected tests/contracts: movement unit tests, maze contract tests, portal mechanics scenarios/catalog.
