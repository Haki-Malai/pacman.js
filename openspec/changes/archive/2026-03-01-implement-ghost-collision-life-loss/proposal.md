## Why

Roadmap scenario `RD-LIFE-001` is still unimplemented: the runtime has no ghost-versus-Pac-Man collision lifecycle that decrements lives and respawns Pac-Man. This leaves a core gameplay loop incomplete and blocks follow-up ghost-eaten behavior.

## What Changes

- Add deterministic ghost/Pac-Man collision detection using same-tile overlap and tile-crossing (head-on swap) checks.
- Add life-loss collision outcome handling: decrement one life, clamp to zero, and respawn Pac-Man at configured spawn tile.
- Keep runtime active at zero lives (no game-over flow in this change).
- Apply Pac-Man-only reset scope on collision (ghost positions remain unchanged).
- Add extensibility seam for future alternate collision outcomes (for example, Pac-Man eating scared ghosts) without replacing detection logic.
- Promote roadmap behavior into implemented mechanics contract coverage (`MEC-LIFE-001`) and remove `RD-LIFE-001` from roadmap artifacts.

## Capabilities

### New Capabilities

- `ghost-collision-life-loss`: Runtime requirements for deterministic ghost/Pac-Man collision detection and current life-loss/respawn handling.

### Modified Capabilities

- None.

## Impact

- Affected runtime code: `WorldState`, `PacmanMovementSystem`, `GhostMovementSystem`, new `GhostPacmanCollisionService`, new `GhostPacmanCollisionSystem`, `GameCompositionRoot`, `gameState`.
- Affected tests/mechanics contract: runtime order harness, new collision unit tests, new `MEC-LIFE-001` mechanics scenario, roadmap/spec ID expectations.
- Affected docs/spec governance surface: `docs/ARCHITECTURE.md` update-order contract and OpenSpec change/spec artifacts for this new capability.
