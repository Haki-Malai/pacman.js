## Context

The runtime already has deterministic collision outcomes (`pacman-hit` vs `ghost-hit`), a Pac-Man death-recovery invulnerability window, and a post-portal blink timer. Today the portal blink is visual-only, so collisions immediately after teleport still apply life loss. This change is intentionally narrow: align collision behavior with the existing blink window without introducing new timers or render states.

## Goals / Non-Goals

**Goals:**
- Make successful portal teleport grant a temporary collision shield for non-scared ghost contact.
- Keep scared-ghost eat behavior active during that same window.
- Reuse existing portal blink timing state (`portalBlinkRemainingMs`) and keep behavior deterministic.
- Preserve current movement, render, and update order architecture.

**Non-Goals:**
- No new visual effects beyond the existing blink.
- No changes to portal pairing, teleport conditions, or blink timing constants.
- No changes to death recovery semantics.
- No score, ghost speed, jail scheduling, or AI rebalance.

## Decisions

1. **Portal blink timer is the invincibility source of truth.**
   - Decision: treat `pacman.portalBlinkRemainingMs > 0` as active portal collision shield.
   - Why: avoids duplicating state and guarantees animation/behavior stay in sync.
   - Alternative: add a separate invincibility timer; rejected as unnecessary complexity.

2. **Collision suppression lives in `GhostPacmanCollisionSystem`.**
   - Decision: after deterministic first-collision detection, short-circuit when outcome is `pacman-hit` and portal shield is active.
   - Why: collision outcome ownership already lives in this system; smallest SOLID/KISS integration point.
   - Alternative: add guards in movement or portal services; rejected because they do not own collision resolution.

3. **Scared collisions remain edible during portal shield.**
   - Decision: do not suppress `ghost-hit` outcomes during portal shield.
   - Why: matches approved behavior (`Eat Scared Only`) and preserves score/jail flow consistency.
   - Alternative: suppress all collisions; rejected by approved behavior delta.

4. **First-collision-per-tick contract remains unchanged.**
   - Decision: if first detected collision is suppressed by portal shield, do not process additional collisions that tick.
   - Why: preserves current deterministic "one collision outcome per tick" policy.
   - Alternative: continue scanning for secondary outcomes; rejected to avoid changing core collision semantics.

## Risks / Trade-offs

- [Risk] Players may interpret blink as full invincibility for all ghosts.
  -> Mitigation: lock behavior explicitly in OpenSpec and mechanics scenarios (`non-scared suppressed`, `scared still edible`).

- [Risk] Future changes might decouple blink and shield accidentally.
  -> Mitigation: centralize guard on `portalBlinkRemainingMs` and cover with unit + mechanics tests.

- [Risk] Suppressed first collision might hide a same-tick scared collision with another ghost.
  -> Mitigation: preserve and document deterministic first-collision-only contract as intentional behavior.

## Migration Plan

1. Add OpenSpec change artifacts and spec deltas.
2. Add portal-shield guard in `GhostPacmanCollisionSystem`.
3. Add unit tests for shield suppression and scared override.
4. Add mechanics scenario `MEC-LIFE-003` and catalog contract update.
5. Run `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`.

Rollback: revert this change set; behavior returns to visual-only portal blink.

## Open Questions

None. Behavior choices are approved and locked.
