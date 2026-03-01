## Context

Runtime teleport flow is active (`PortalService`, movement systems, blink feedback), but production map parsing currently yields zero portal tiles because `maze.json` contains neither portal tile flags nor portal spawn objects. Existing portal tests use dedicated fixtures and therefore do not catch production-map regression.

## Goals / Non-Goals

**Goals:**
- Enable portal teleport in production default map without altering teleport semantics.
- Keep portal endpoint derivation deterministic and data-driven.
- Keep existing portal service behavior and collision-shield behavior unchanged.
- Upgrade mechanics/spec contracts so production portal availability is treated as implemented behavior.

**Non-Goals:**
- No changes to `PortalService` pairing guards or movement system order.
- No new rendering/UI effects.
- No migration to `pacman.json` loader format.
- No hardcoded runtime endpoint constants.

## Decisions

1. **Portal source is `Spawns` portal objects in `maze.json`.**
   - Decision: add `type: "portal"` objects (`portal-left`/`portal-right`) to production `Spawns` layer.
   - Why: keeps current runtime asset pipeline unchanged and keeps portal data map-authored.
   - Alternative: switch runtime to `pacman.json`; rejected due larger parser/runtime blast radius.

2. **Parser resolves objects to nearest walkable tile.**
   - Decision: in `parseTiledMap`, convert each portal object to a portal endpoint tile using nearest walkable tile search.
   - Walkable means: in bounds, `gid !== null`, `collides === false`, `penGate === false`.
   - Why: portal objects may be authored on edge/void coordinates while teleport should occur on reachable tunnel tiles.
   - Alternative: exact object tile mapping; rejected because edge object coordinates can map to non-playable cells.

3. **Resolution ordering and bounds are deterministic.**
   - Decision: search by Manhattan distance from object tile, with deterministic tie-break (`distance`, then `y`, then `x`) and max radius `4`.
   - Why: stable behavior and predictable tests.
   - Alternative: unbounded flood search; rejected as unnecessary and less explicit.

4. **Portal service remains unchanged.**
   - Decision: keep `PortalService` pairing based on `collision.portal` scan order.
   - Why: existing portal mechanics and tests already validate core service behavior.

## Risks / Trade-offs

- [Risk] Mis-authored portal objects may resolve to unexpected nearby tiles.
  -> Mitigation: add explicit parser/maze contract tests for expected endpoints `(1,26)` and `(49,26)`.

- [Risk] Odd number of portal objects could produce unpaired endpoint behavior.
  -> Mitigation: keep service behavior unchanged; tests assert two endpoints for production map.

- [Risk] Mechanics metadata drift when promoting roadmap scenario.
  -> Mitigation: update mechanics implemented IDs and roadmap IDs together in contract tests.

## Migration Plan

1. Add OpenSpec change artifacts and modified capability delta.
2. Add portal objects to `maze.json` and update `nextobjectid`.
3. Extend parser to derive portal collision endpoints from portal spawn objects.
4. Update maze/parser/mechanics tests and scenario catalogs.
5. Run `typecheck`, `lint`, `test`, `spec:check`.

Rollback: revert this change; production map returns to no active portals.

## Open Questions

None.
