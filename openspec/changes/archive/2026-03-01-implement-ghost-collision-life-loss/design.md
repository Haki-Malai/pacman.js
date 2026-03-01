## Context

Current runtime update flow moves Pac-Man and ghosts but does not resolve their contact into gameplay consequences. Lives are tracked in global game state and rendered in HUD, yet no system consumes lives on ghost collisions. The implementation must remain deterministic, align with system-order architecture, and preserve room for a future opposite outcome (Pac-Man eating vulnerable ghosts).

## Goals / Non-Goals

**Goals:**

- Detect ghost/Pac-Man collisions deterministically from tile state each tick.
- Apply current collision outcome as Pac-Man life loss with spawn-tile respawn.
- Keep collision detection separate from outcome policy for future extensibility.
- Update mechanics contract artifacts to move life-loss behavior from roadmap to implemented.

**Non-Goals:**

- No game-over state, pause-on-zero-lives, or level restart flow.
- No ghost death/jail-return behavior when scared.
- No broad gameplay rebalance beyond collision/life-loss flow.

## Decisions

1. **Introduce a dedicated collision domain service plus a dedicated collision system.**
   - Why: detection and outcome handling are distinct concerns; this keeps future outcome branching local.
   - Alternative considered: embed checks inside movement systems; rejected due coupling and harder future extension.

2. **Collision rule is same-tile OR tile-crossing in one tick.**
   - Why: protects against missed head-on collisions caused by ordered system movement.
   - Alternative considered: same-tile-only; rejected because head-on swaps can be missed.

3. **Track previous tile snapshots in `WorldState` every tick.**
   - Why: tile-crossing detection requires both prior and current tile state for Pac-Man and each ghost.
   - Alternative considered: infer from movement vectors only; rejected as less explicit and more brittle.

4. **Current outcome policy always resolves to Pac-Man hit.**
   - Why: locked behavior for this change is life loss even if ghost is scared.
   - Alternative considered: conditional scared handling now; rejected as out of scope.

5. **Apply at most one life loss per tick.**
   - Why: deterministic and matches approved behavior for multi-ghost collisions in same frame.
   - Alternative considered: life loss per ghost; rejected by product decision.

6. **Respawn Pac-Man only; do not reset ghost positions.**
   - Why: approved reset scope and minimal behavior change.
   - Alternative considered: full entity reset; rejected as broader gameplay change.

## Risks / Trade-offs

- [Risk] Spawn tile could be unsafe if a ghost is occupying it.  
  -> Mitigation: keep one-life-per-tick clamp behavior; defer spawn safety/game-over rules to future change.

- [Risk] Additional system in update chain can drift from documented architecture contract.  
  -> Mitigation: update `ARCHITECTURE.md` and runtime-order mechanics coverage in same change.

- [Risk] Global game state makes life-loss side effects cross-cutting in tests.  
  -> Mitigation: explicitly reset game state in collision tests and keep assertions deterministic.

## Migration Plan

1. Add collision service and collision system with outcome abstraction.
2. Extend `WorldState` for spawn and previous-tile snapshots.
3. Wire snapshot writes into Pac-Man and ghost movement systems.
4. Insert collision system in runtime update order after ghost movement.
5. Update unit/mechanics tests and mechanics spec/roadmap artifacts.
6. Run completion gates (`typecheck`, `lint`, `test`, `spec:check`).

## Open Questions

- None.
