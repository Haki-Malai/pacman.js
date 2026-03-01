## Context

Production map portals now resolve correctly, but default map tunnel edges still contain void cells (`gid: 0`) adjacent to playable portal endpoints. Current collision lookup treats missing/out-of-bounds tiles as non-blocking empty space, which allows movement to leak outside the maze.

## Goals / Non-Goals

**Goals:**
- Prevent movement into out-of-bounds and map-void cells for all moving entities.
- Preserve existing portal teleport semantics, including center-only behavior and same-tick guard.
- Keep implementation minimal, deterministic, and local to collision/parsing layers.
- Add explicit automated regression coverage.

**Non-Goals:**
- No changes to public runtime API.
- No changes to portal pairing algorithm or blink/shield mechanics.
- No visual/rendering changes.

## Decisions

1. **Out-of-bounds collision reads are blocking.**
   - Decision: `CollisionGrid.getTileAt` returns a blocking boundary sentinel for any out-of-bounds coordinate.
   - Why: all movement logic already reads neighbor collision tiles through this API, so this closes boundary leaks without broad system changes.

2. **Void map cells are parsed as blocking.**
   - Decision: `TiledParser` emits fully blocking collision tiles for `gid <= 0` cells.
   - Why: default maze intentionally includes void cells at boundaries; they are non-playable and should never be traversable.

3. **Portal/service systems remain unchanged.**
   - Decision: no logic changes in `PortalService`, `PacmanMovementSystem`, or `GhostMovementSystem`.
   - Why: with blocking void/out-of-bounds cells, outward input at portal endpoints no longer leaks and teleport still resolves from centered endpoint tiles.

## Risks / Trade-offs

- [Risk] Fixture grids that rely on implicit open out-of-bounds behavior could break.
  -> Mitigation: add targeted movement unit coverage and portal mechanics regression scenario.

- [Risk] Treating void cells as blocking could affect traversal assumptions elsewhere.
  -> Mitigation: run full type/lint/test/spec gates and verify existing portal + life-loss scenarios remain green.

## Migration Plan

1. Add OpenSpec change artifacts and capability deltas.
2. Implement collision boundary sentinel behavior.
3. Implement parser void-as-blocking behavior.
4. Add/update movement, maze contract, and portal mechanics tests + catalog IDs.
5. Run required validation gates (`typecheck`, `lint`, `test`, `spec:check`).

Rollback: revert this change and previous behavior returns (void/out-of-bounds traversal possible).

## Open Questions

None.
