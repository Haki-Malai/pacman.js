## Context

Current collision detection already supports deterministic contact checks and pluggable outcomes, but runtime resolution always applies Pac-Man hit behavior. Ghost-eaten behavior (`RD-GHOST-001`) remains roadmap-only. Separately, Pac-Man respawn has no dedicated recovery blink/invulnerability window, and ghost scared exit currently hard-switches visuals without gradual recovery.

This change is cross-cutting across collision resolution, movement timing, animation state, rendering, and mechanics contracts. The implementation must remain deterministic and preserve current update order and tile-space collision detection semantics.

## Goals / Non-Goals

**Goals:**

- Implement scared-ghost collision outcome as `ghost-hit` with deterministic ghost jail return flow.
- Add deterministic Pac-Man post-death recovery window with blink + temporary invulnerability.
- Add deterministic scared-to-normal ghost visual recovery crossfade.
- Preserve existing collision detection algorithm and one-collision-per-tick behavior.
- Promote ghost-eaten roadmap behavior to implemented mechanics spec coverage.

**Non-Goals:**

- No game-over or level transition flow.
- No ghost release tween re-entry for eaten ghosts (use free-in-jail mode only).
- No scoring rebalance outside locked chain table values.
- No update-order rearchitecture.

## Decisions

1. **Keep collision detection pure and unchanged; extend only outcome policy.**
   - Decision: keep same-tile and tile-crossing detection in `GhostPacmanCollisionService`; switch default resolver to state-aware outcome (`scared -> ghost-hit`, otherwise `pacman-hit`).
   - Why: minimizes regression risk and keeps detection reusable for future outcomes.
   - Alternative considered: move all policy into collision system and keep service hardcoded; rejected because it weakens the current domain seam.

2. **Pac-Man invulnerability is tied to death recovery window and enforced in collision system.**
   - Decision: if recovery timer is active, collision system returns early and applies no outcome that tick.
   - Why: deterministic and explicit safety gate; avoids incidental life drains from spawn overlap.
   - Alternative considered: cooldown flag outside entity state; rejected because timer-based entity-local state is simpler to reset and test.

3. **Ghost-eaten return flow uses free-in-jail after fixed delay, not full release pipeline.**
   - Decision: eaten ghost teleports to jail return tile, stays non-free for 2000ms, then becomes `free=true` in place.
   - Why: matches locked product default and keeps implementation small.
   - Alternative considered: enqueue into release scheduler cadence; rejected as out-of-scope behavior shift.

4. **Chain scoring is fixed and capped (200/400/800/1600).**
   - Decision: score per eaten ghost uses chain index with cap at last value.
   - Why: deterministic classic behavior and explicit roadmap closure.
   - Alternative considered: fixed score per ghost; rejected by locked default.

5. **Scared visual recovery is render-driven crossfade with animation-system timing state.**
   - Decision: animation system tracks per-ghost recovery progress; render system blends scared/base sprites using complementary alpha for 900ms.
   - Why: separates timing state from draw mechanics and avoids adding new assets.
   - Alternative considered: hard animation swap only; rejected because it does not satisfy gradual recovery requirement.

6. **Pac-Man death blink uses deterministic variable interval thresholds.**
   - Decision: movement system advances elapsed time and toggles visibility when elapsed passes precomputed next-toggle threshold derived from linear interpolation between start/end intervals.
   - Why: deterministic regardless of frame pacing while preserving “fast then slower” profile.
   - Alternative considered: fixed interval with alpha fade; rejected because cadence-change requirement is explicit.

## Risks / Trade-offs

- [Risk] Dual blink systems (portal blink and death recovery blink) could conflict in visibility rules.  
  -> Mitigation: render visibility gives death recovery precedence, then portal blink fallback.

- [Risk] Ghost-eaten delayed free handles can leak if system is destroyed mid-delay.  
  -> Mitigation: `GhostPacmanCollisionSystem.destroy()` cancels all pending delayed handles.

- [Risk] Chain reset semantics can drift from intended scared-session scope.  
  -> Mitigation: reset chain when no ghosts are scared and validate with mechanics tests.

- [Risk] Crossfade adds extra draw calls for recovering ghosts.  
  -> Mitigation: draw both sprites only while recovery map entry exists; default path remains unchanged.

## Migration Plan

1. Add change artifacts and spec deltas first.
2. Implement constants and state model extensions.
3. Implement collision/pacman recovery behavior and ghost-eat flow.
4. Implement animation timing + render crossfade.
5. Update mechanics specs/roadmap/tests.
6. Run gates: `typecheck`, `lint`, `test`, `spec:check`.
7. Archive change after all tasks are checked complete.

Rollback strategy: revert this change set; behavior falls back to existing life-loss-only collision flow and current scared animation toggle.

## Open Questions

None. All behavior defaults are locked in this proposal.
