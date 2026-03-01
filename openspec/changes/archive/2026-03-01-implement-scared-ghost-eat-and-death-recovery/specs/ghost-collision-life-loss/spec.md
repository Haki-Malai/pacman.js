## MODIFIED Requirements

### Requirement: Collision currently resolves to Pac-Man life loss
For this capability version, detected ghost/Pac-Man collision SHALL resolve by scared-state policy: collisions with non-scared ghosts SHALL resolve to Pac-Man hit behavior, and collisions with scared ghosts SHALL resolve to ghost-hit behavior.

#### Scenario: Non-scared ghost collision applies Pac-Man hit
- **WHEN** Pac-Man collides with an active free non-scared ghost
- **THEN** the runtime applies Pac-Man hit behavior

#### Scenario: Scared ghost collision applies ghost-hit
- **WHEN** Pac-Man collides with an active free scared ghost
- **THEN** the runtime applies ghost-hit behavior for the colliding ghost

### Requirement: Pac-Man hit decrements one life and respawns at spawn tile
When Pac-Man hit behavior is applied, the runtime SHALL decrement lives by exactly one, clamp lives to zero minimum, respawn Pac-Man at the configured Pac-Man spawn tile with deterministic spawn direction state, and start deterministic death recovery state.

#### Scenario: Life loss, respawn, and recovery state are applied
- **WHEN** Pac-Man hit behavior runs and current lives are greater than zero
- **THEN** lives are reduced by one, Pac-Man respawns at spawn tile with reset movement progress, and death recovery blink/invulnerability state starts

#### Scenario: Lives are clamped at zero
- **WHEN** Pac-Man hit behavior runs while lives are already zero
- **THEN** lives remain zero and do not become negative

### Requirement: At most one life loss is applied per tick
The runtime MUST process at most one collision outcome per tick even when multiple active free ghosts collide with Pac-Man during that tick.

#### Scenario: Multiple same-tick collisions process one deterministic outcome
- **WHEN** two or more active free ghosts collide with Pac-Man in the same tick
- **THEN** exactly one collision outcome is applied in that tick using deterministic ghost iteration order

## ADDED Requirements

### Requirement: Pac-Man death recovery window prevents immediate re-hit
After Pac-Man hit respawn, the runtime SHALL apply a fixed-duration death recovery window during which collision effects are ignored for Pac-Man and recovery visibility blink timing follows deterministic cadence progression.

#### Scenario: Recovery window suppresses collision effects
- **WHEN** Pac-Man is in active death recovery and collides with an active free ghost
- **THEN** no life-loss or ghost-hit outcome is applied for that tick

#### Scenario: Recovery state expires deterministically
- **WHEN** recovery timer reaches zero after elapsed tick progression
- **THEN** Pac-Man becomes vulnerable again and normal collision outcome processing resumes

### Requirement: Ghost-hit applies chain scoring and jail return flow
When ghost-hit behavior is applied, the runtime SHALL award chain-based points, teleport the eaten ghost to jail return tile, set it non-free immediately, and transition it to free-in-jail exactly after configured delay.

#### Scenario: Ghost-hit awards chain score and teleports ghost to jail
- **WHEN** Pac-Man collides with a scared active free ghost
- **THEN** score increases by current chain value and the ghost is moved to jail return tile in non-free state

#### Scenario: Eaten ghost becomes free in jail after delay
- **WHEN** configured ghost-eat jail delay elapses for an eaten ghost
- **THEN** that ghost becomes free while remaining at jail return tile
