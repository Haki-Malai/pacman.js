## ADDED Requirements

### Requirement: Ghost and Pac-Man contact is detected deterministically in tile space
The runtime SHALL detect ghost/Pac-Man contact when they overlap on the same tile, and MUST also detect head-on tile-crossing contact when Pac-Man and a ghost swap tiles within one tick.

#### Scenario: Same-tile contact triggers collision
- **WHEN** Pac-Man and an active free ghost occupy the same tile during a tick
- **THEN** the collision flow is triggered for that tick

#### Scenario: Tile-crossing contact triggers collision
- **WHEN** Pac-Man moves from tile A to B while an active free ghost moves from tile B to A in the same tick
- **THEN** the collision flow is triggered for that tick

### Requirement: Collision currently resolves to Pac-Man life loss
For this capability version, any detected ghost/Pac-Man collision SHALL resolve to Pac-Man hit behavior regardless of scared-state flags.

#### Scenario: Scared flag does not change current collision outcome
- **WHEN** Pac-Man collides with a scared ghost
- **THEN** the runtime applies Pac-Man hit behavior for this change set

### Requirement: Pac-Man hit decrements one life and respawns at spawn tile
When Pac-Man hit behavior is applied, the runtime SHALL decrement lives by exactly one, clamp lives to zero minimum, and respawn Pac-Man at the configured Pac-Man spawn tile with deterministic spawn direction state.

#### Scenario: Life loss and respawn are applied
- **WHEN** Pac-Man hit behavior runs and current lives are greater than zero
- **THEN** lives are reduced by one and Pac-Man respawns at spawn tile with reset movement progress

#### Scenario: Lives are clamped at zero
- **WHEN** Pac-Man hit behavior runs while lives are already zero
- **THEN** lives remain zero and do not become negative

### Requirement: At most one life loss is applied per tick
The runtime MUST process at most one Pac-Man life-loss outcome per tick even when multiple active free ghosts collide with Pac-Man during that tick.

#### Scenario: Multiple same-tick collisions consume one life
- **WHEN** two or more active free ghosts collide with Pac-Man in the same tick
- **THEN** exactly one life is deducted in that tick

### Requirement: Pac-Man hit reset scope is Pac-Man-only
Pac-Man hit behavior SHALL reset Pac-Man state only, and MUST NOT reset ghost positions as part of this capability.

#### Scenario: Ghost position is preserved during Pac-Man respawn
- **WHEN** Pac-Man collision triggers life-loss and respawn
- **THEN** the colliding ghost remains at its runtime position and is not force-reset by this flow
