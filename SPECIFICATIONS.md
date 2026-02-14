# Specifications

## Audience
This document is written for product owners and designers.

It describes the player-facing behavior of the game, what is already implemented, what is planned, and what must stay stable unless explicitly approved.

## Product Goal
Deliver a classic maze-chase experience where:
- the player controls Pacman through a tile maze,
- ghosts move with predictable rules plus controlled randomness,
- movement, pause, and portal behavior feel consistent and reliable,
- the game remains easy to evolve without unintentionally changing existing behavior.

## Scope and Status
This specification contains two scopes:
- **Implemented**: behavior that exists today and is covered by automated checks.
- **Roadmap**: planned behavior that is intentionally **not implemented yet**.

Roadmap items are design intent only and must not be treated as current game behavior.

## Current Experience (Implemented)
### Session start and ownership
- The game starts in `#game-root`.
- Creating a new game instance replaces the previous active instance.

### Core movement feel
- Pacman movement is grid-based with buffered turns.
- A requested turn applies at tile center when legal.
- Blocking edges prevent illegal crossing from center.

### Ghost behavior baseline
- Ghosts start inside jail, move within jail bounds, then release after delay + exit motion.
- Once free, ghosts choose directions with deterministic rules and seeded randomness support.
- Scared mode changes ghost visual state and movement speed.

### Portals
- Teleport works only when an entity is centered.
- A same-tick guard prevents immediate bounce-back teleport loops.
- Teleport is rejected if destination is fully blocked.

### Pause and timing
- Pause freezes gameplay movement and scheduled progression.
- Resume continues from frozen progress.

### HUD and debug
- HUD shows score and lives in a lightweight overlay.
- Collision debug can be toggled to inspect tile collision data.

## Player Controls
- Movement: `Arrow` keys or `WASD`.
- Pause toggle: `Space`.
- Pointer/click on game canvas: toggles pause.
- Collision debug toggle: `C`.
- Copy debug panel text: `Shift + C`.
- Toggle scared state for all ghosts: `H`.

## Character Behaviors
### Pacman
- Keeps current direction unless a valid buffered turn can be applied at center.
- Visual orientation updates based on movement direction.

### Ghosts
- While jailed: oscillate within configured jail horizontal bounds.
- Release lifecycle: delay, exit movement, then marked as free.
- While free: choose legal directions, avoiding immediate reverse when alternatives exist.
- Scared mode: uses scared visuals and slower speed until restored.

## Session Flow and States
- **Running**: all gameplay systems update in fixed order.
- **Paused**: gameplay movement/timers are frozen; pause-safe debug behavior continues.
- **Destroyed**: loop/systems/input/scheduler resources are cleaned up safely and idempotently.

## Presentation and UI
- Camera follows Pacman and clamps to maze bounds.
- World is rendered on canvas (map + entities).
- HUD is rendered via DOM overlay.
- Debug overlay can draw collision lines/markers and contextual tile details.

## Level and Content Rules
- The production maze must provide:
  - a tile layer for maze geometry,
  - a spawn object layer,
  - pacman and ghost-home spawn metadata.
- Current production map dimensions are fixed to the authored maze asset.
- Collision, portal, and pen-gate behavior comes from map tile properties.

## Quality Guarantees
- Gameplay stepping is fixed-step to reduce frame-rate dependence.
- Scheduler behavior is consistent with pause/resume semantics.
- Seeded runs can reproduce deterministic ghost behavior.
- Core mechanics are covered by regular + fuzz-style automated tests.

## Implemented Mechanics Catalog
Product-facing behavior contracts (traceability IDs):

| ID | Product expectation |
| --- | --- |
| MEC-PAC-001 | Buffered turn applies only at center when legal. |
| MEC-PAC-002 | Blocked buffered turn does not override current direction. |
| MEC-PAC-003 | Blocked edge crossing from center is prevented; in-tile continuation can complete. |
| MEC-GHO-001 | Ghost center decisions avoid reverse direction when alternatives exist. |
| MEC-GHO-002 | Blocked ghost chooses perpendicular options before reverse fallback. |
| MEC-GHO-003 | Seeded ghost simulation is deterministic. |
| MEC-JAIL-001 | Jailed ghosts remain within jail bounds before release. |
| MEC-JAIL-002 | Release delay + exit motion transitions ghost to free state. |
| MEC-PORT-001 | Teleport requires centered entity. |
| MEC-PORT-002 | Same-tick portal bounce is prevented. |
| MEC-PORT-003 | Teleport fails when destination portal tile is fully blocked. |
| MEC-TIME-001 | Pause freezes movement, timers, and tweens. |
| MEC-TIME-002 | Resume continues from frozen elapsed state. |
| MEC-ANI-001 | Scared toggle switches animation/speed and restores defaults. |
| MEC-RUN-001 | Runtime update order stays aligned with architecture contract. |

## Invariants Catalog
Always-true behavior guards (traceability IDs):

| ID | Invariant guarantee |
| --- | --- |
| INV-BOUNDS-001 | Entity tile positions stay within map bounds. |
| INV-COLLIDE-001 | Blocked edges cannot be crossed from tile center. |
| INV-JAIL-001 | Non-free ghosts stay inside jail bounds before release. |
| INV-NAN-001 | Motion values stay finite (no NaN/Infinity). |
| INV-PORT-001 | Entity cannot teleport twice in the same tick. |
| INV-PAUSE-001 | Pause freezes progression semantics. |
| INV-RNG-001 | Seeded runs remain deterministic. |

## Roadmap (Not Implemented)
Planned behaviors below are **not implemented** yet:

| ID | Planned behavior | Status |
| --- | --- | --- |
| RD-GHOST-001 | Ghost death -> jail -> respawn lifecycle | roadmap |
| RD-SCORE-001 | Collectibles update score/events with gameplay integration | roadmap |
| RD-LIFE-001 | Life-loss and deterministic reset flow | roadmap |
| RD-LEVEL-001 | Level completion transition after full clear | roadmap |
| RD-MAP-001 | Explicit production portal/pen-gate map contract gate | roadmap |

## Change Control
- This file is the behavior contract used to protect previously approved decisions.
- If a proposed change may alter behavior, agents must present a **Proposed Behavior Delta** and get explicit user approval first.
- Behavior-preserving refactors may proceed without pre-approval, but must still pass validation and reconcile with this specification.
- If anything is unclear, agents must stop and ask before changing behavior.

## Verification Commands
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run spec:check`
