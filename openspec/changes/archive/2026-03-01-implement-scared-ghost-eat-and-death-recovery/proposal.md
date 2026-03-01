## Why

Roadmap scenario `RD-GHOST-001` is still unimplemented, so scared-ghost collisions do not yet produce ghost-eaten gameplay. In addition, Pac-Man death reset currently lacks a deterministic recovery window (blink + invulnerability), which causes immediate re-hit risk and limits visual feedback quality.

## What Changes

- Extend ghost/Pac-Man collision outcome policy so scared collisions resolve to `ghost-hit` while non-scared collisions remain `pacman-hit`.
- Add Pac-Man death recovery behavior after life-loss respawn: deterministic blink profile and temporary invulnerability for a fixed duration.
- Add ghost-eaten handling: chain scoring, immediate jail teleport, and delayed free-in-jail transition after 2 seconds.
- Add scared-to-normal ghost recovery visual: slow crossfade from scared sprite to base ghost sprite.
- Preserve deterministic detection and first-collision-per-tick handling from current collision capability.
- Promote roadmap ghost-eaten behavior into implemented mechanics coverage and remove `RD-GHOST-001` from roadmap artifacts.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ghost-collision-life-loss`: collision outcome policy now branches by scared state and includes Pac-Man recovery invulnerability gating.
- `jail-release-and-pause-feedback`: add deterministic scared-to-normal ghost visual recovery transition behavior.

## Impact

- Affected systems: `GhostPacmanCollisionSystem`, `GhostPacmanCollisionService`, `PacmanMovementSystem`, `AnimationSystem`, `RenderSystem`, and composition wiring.
- Affected domain/state: `PacmanEntity`, `WorldState`, constants, and collision outcome policy types.
- Affected tests/contracts: collision unit tests, animation/render tests, mechanics scenario catalog (`MEC-*` additions), roadmap/spec ID expectations.
