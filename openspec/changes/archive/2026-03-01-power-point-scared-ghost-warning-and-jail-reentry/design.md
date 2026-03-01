## Context

The runtime already supports scared-state collision outcomes, ghost-eat scoring, jail movement/release, and Pac-Man blink timing, but those behaviors are not connected to power-point consumption. Scared exit currently uses a crossfade map in world state and render layering, while eaten ghost return uses a dedicated delayed free-in-place timer in collision handling. This change cuts across collectible consumption, ghost animation/render, collision handling, and jail release scheduling.

## Goals / Non-Goals

**Goals:**
- Trigger scared mode from power-point consumption for all active ghosts with deterministic timing.
- Replace scared-exit crossfade with deterministic blue/base warning alternation in the final scared window.
- Reuse Pac-Man blink interval progression logic for ghost warning cadence.
- Route eaten ghosts back through existing jail wait/roam/release lifecycle instead of free-in-place delay.
- Keep update order unchanged and maintain deterministic system behavior.

**Non-Goals:**
- No update order changes for immediate same-tick power-point collision overrides.
- No score-table or speed rebalance outside current constants and scared/default behavior.
- No new assets, sprite sheets, or rendering backends.
- No game-over, level progression, or broader ghost AI behavior changes.

## Decisions

1. **Scared timing moves to world-state timer maps.**
   - Decision: replace crossfade state with two maps: per-ghost scared remaining time and per-ghost warning visual toggle state.
   - Why: keeps warning and expiry deterministic and testable without extra entity fields.
   - Alternative: per-entity class fields; rejected to avoid widening entity API for temporary effect state.

2. **Power-point handling lives in `CollectibleSystem`.**
   - Decision: on power-point consume, set/refresh scared timer and warning state for all active ghosts, and reset ghost eat chain counter.
   - Why: consumption ownership already belongs to collectible logic; this is the narrowest integration point.
   - Alternative: add a new dedicated scared controller system; rejected as unnecessary abstraction.

3. **Warning cadence reuses Pac-Man blink profile.**
   - Decision: warning toggle thresholds use the same variable interval progression as Pac-Man death recovery (fast to slow).
   - Why: satisfies locked behavior and avoids introducing a second cadence model.
   - Alternative: fixed interval; rejected by requirements.

4. **Ghost-hit return flow delegates to jail release system.**
   - Decision: collision system teleports and resets ghost state, then requeues release through `GhostReleaseSystem` instead of local delayed free timer.
   - Why: centralizes jail release policy and restores the same wait/roam/release behavior path.
   - Alternative: keep collision-owned delayed free-in-place; rejected by requirements.

5. **Debug scared toggle must update timers, not only booleans.**
   - Decision: `KeyH` path uses the same timer/warning setup/clear behavior as runtime scared state transitions.
   - Why: prevents divergent “debug-only” state where visuals and collision policy disagree.
   - Alternative: leave debug toggle as raw flag flip; rejected as inconsistent.

## Risks / Trade-offs

- [Risk] Release requeue can schedule duplicate releases for a ghost.
  -> Mitigation: track queued/releasing ghosts in `GhostReleaseSystem` and ignore duplicate queue requests.

- [Risk] Warning toggles can desync under non-finite delta values.
  -> Mitigation: apply the same safe-delta guards used by existing timing systems.

- [Risk] Removing crossfade may break existing render expectations.
  -> Mitigation: replace crossfade tests with explicit alternating-sheet assertions and update mechanics scenario expectations.

- [Risk] Scared timer refresh semantics may drift when another power point is consumed mid-window.
  -> Mitigation: always reset timer + warning phase and reset chain in one path with direct unit coverage.

## Migration Plan

1. Add OpenSpec proposal/design/spec/task artifacts for this change.
2. Replace crossfade constants/state with scared timer and warning state.
3. Implement power-point scared trigger and warning timer progression.
4. Rework ghost-hit jail return to use release-system requeue.
5. Update render path for blue/base alternation warning visuals.
6. Update tests/spec contracts and run gates: `typecheck`, `lint`, `test`, `spec:check`.

Rollback: revert this change set to restore current crossfade and delayed free-in-place behaviors.

## Open Questions

None. Behavior defaults are locked by approved plan.
