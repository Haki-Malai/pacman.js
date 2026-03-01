## Context

Production map teleport became available through spawn-derived portal endpoints, but only one pair was authored. At the same time, boundary hardening intentionally blocks non-portal tiles that leak into void, so top-lane travel no longer leaks but also cannot teleport unless explicitly declared as portal endpoints.

## Goals / Non-Goals

**Goals:**
- Enable deterministic top/bottom production portal teleport without regressing existing left/right teleport.
- Keep behavior map-authored through `Spawns` objects, not hardcoded coordinates.
- Preserve current portal movement contracts (center-only, same-tick bounce guard, blocked-destination guard).
- Keep void/OOB leak protections active for non-portal tiles.

**Non-Goals:**
- No public API changes to runtime lifecycle.
- No movement-rule, render, or visual-effect changes.
- No removal of fallback pairing behavior used by existing fixture-based tests.

## Decisions

1. **Portal pairing identity is map-authored using `pairId`.**
   - Decision: add `pairId` string property to all `type: "portal"` spawn objects.
   - Why: avoids brittle implicit scan ordering when map has more than one pair.

2. **Parser resolves endpoints, marks portal collision, and emits explicit `portalPairs`.**
   - Decision: `parseTiledMap` resolves each portal object to nearest walkable tile, deduplicates by resolved tile, then builds pair metadata.
   - Pairing strategy:
     - primary: group by `pairId`, deterministic sort by `(y, x, order)` then pair sequentially;
     - fallback: pair remaining endpoints sequentially by `(y, x, order)`.
   - Why: deterministic multi-pair support while preserving prior behavior for unlabeled fixtures.

3. **Portal service prefers explicit pairs but keeps legacy fallback.**
   - Decision: `PortalService` accepts optional explicit pairs; if present, use them directly; otherwise use existing scan-order pairing.
   - Why: keep compatibility with existing tests/grids and avoid broad fixture churn.

4. **Void leak guard remains unchanged and portal-aware.**
   - Decision: continue skipping leak hardening on tiles already marked `collision.portal === true`.
   - Why: top/bottom endpoints must remain traversable portal tiles while adjacent non-portal leak-band tiles remain blocked.

## Risks / Trade-offs

- [Risk] Duplicate portal objects resolving to the same tile could create unstable mapping.
  -> Mitigation: dedupe resolved endpoints by tile key before pairing.

- [Risk] Odd number of endpoints per `pairId` may produce partially paired groups.
  -> Mitigation: deterministic fallback sequential pairing for unconsumed endpoints.

- [Risk] Contract drift between parser output and mechanics catalog.
  -> Mitigation: update maze contract + mechanics spec + mechanics contract test together.

## Migration Plan

1. Add OpenSpec artifacts and modified capability delta.
2. Update map spawn objects (`pairId`, top/bottom portals).
3. Extend parser + runtime/service wiring for explicit pair metadata.
4. Update map/service/mechanics tests and mechanics catalog IDs.
5. Run validation gates (`typecheck`, `lint`, `test`, `spec:check`).

Rollback: revert this change; production behavior returns to horizontal-only portal pair.

## Open Questions

None.
