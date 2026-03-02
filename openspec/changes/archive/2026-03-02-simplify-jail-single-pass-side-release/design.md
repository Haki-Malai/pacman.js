## Context

The runtime currently stages ghost release by delay/interval timing, then uses tween alignment and tween exit transitions in `GhostReleaseSystem`. At the same time, movement rules treat all ghosts as pen-gate bypass actors, so once a ghost is free it can still cross pen-gate edges. The requested behavior needs deterministic side-staged release routing, one-pass gate traversal only during release, and collision-valid movement with unchanged speed.

This change touches domain movement semantics, release system orchestration, and mechanics/spec test coverage.

## Goals / Non-Goals

**Goals:**
- Preserve existing release cadence timing and one-by-one scheduling.
- Replace tween release path with deterministic per-tick movement phases.
- Alternate release side staging (`minX` then `maxX`, repeating) in deterministic order.
- Permit pen-gate traversal exactly once per jail-release cycle.
- Block pen-gate traversal for normal/free ghost movement.
- Keep ghost speed unchanged and avoid wall overlap by using collision-validated movement.

**Non-Goals:**
- No change to Pac-Man movement behavior.
- No change to external runtime API surface.
- No map asset/schema migration.
- No changes to scared/death scoring logic beyond keeping jail re-release compatibility.

## Decisions

1. Introduce actor-specific gate semantics via `MovementActor = 'pacman' | 'ghost' | 'ghostRelease'`.
   - Rationale: We need two ghost movement policies (normal locked vs release one-pass allowed) without global flags in collision data.
   - Alternative: store per-ghost bypass flags inside `canMove`; rejected because the movement API currently does not accept entity state.

2. Refactor release execution to phase-based movement in `GhostReleaseSystem`:
   - `to_side_center`: center on alternating side target (`minX` or `maxX`, jail row).
   - `to_gate_column`: move horizontally to chosen gate column on jail row.
   - `cross_gate_once`: move up through pen gate into release tile above jail.
   - `complete`: finalize free state and cleanup.
   - Rationale: removes tween overlap risk and keeps movement speed/collision behavior consistent with normal runtime stepping.
   - Alternative: keep tweens and clamp interpolation paths; rejected because it still decouples from collision checks.

3. Use deterministic alternating side sequence with local toggle (`left` first).
   - Rationale: explicit predictability matching requested behavior.
   - Alternative: per-ghost fixed side mapping; rejected per approved defaults.

4. Resolve gate column with preferred-side-first scan across jail bounds.
   - Rationale: maintain release continuity when preferred side is blocked while staying deterministic.
   - Alternative: fail release immediately on blocked preferred side; rejected as unnecessarily brittle.

5. Reuse existing jail lifecycle for reset semantics.
   - Rationale: setting `free=false` and `soonFree=true` on jail return already creates a new release cycle; no extra persisted pass token is needed when release actor gating is scoped to release phases.
   - Alternative: add explicit `hasUsedGatePass` state field; rejected as redundant with phase-driven movement.

## Risks / Trade-offs

- [Risk] Phase logic can stall if no collision-valid path to a release tile is available.
  -> Mitigation: deterministic fallback gate-column scan; if no valid option exists, cancel exiting state and keep ghost in jail roaming flow for future attempts.

- [Risk] Existing tests assert tween behavior and will fail after refactor.
  -> Mitigation: replace tween assertions with phase/position/state assertions tied to release semantics.

- [Risk] Changing pen-gate behavior for normal ghosts may affect edge-case maps/tests.
  -> Mitigation: add direct movement unit coverage and mechanics scenarios for lock-after-release and re-release pass restore.

## Migration Plan

1. Add OpenSpec change artifacts and modified capability delta.
2. Implement movement actor update and pen-gate semantics split.
3. Refactor `GhostReleaseSystem` to phase-based deterministic release movement.
4. Update/add tests and mechanics scenario contracts.
5. Run gates: `typecheck`, `lint`, `test`, `spec:check`.

Rollback: revert the change branch/commit to restore tween release and global ghost pen-gate bypass behavior.

## Open Questions

- None.
