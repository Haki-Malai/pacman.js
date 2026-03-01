## MODIFIED Requirements

### Requirement: Collision currently resolves to Pac-Man life loss
For this capability version, detected ghost/Pac-Man collision SHALL resolve by scared-state policy: collisions with non-scared ghosts SHALL resolve to Pac-Man hit behavior, and collisions with scared ghosts SHALL resolve to ghost-hit behavior. During active post-portal Pac-Man blink shield, non-scared ghost collisions SHALL be suppressed for that tick, while scared ghost collisions SHALL still resolve to ghost-hit behavior.

#### Scenario: Non-scared ghost collision applies Pac-Man hit
- **WHEN** Pac-Man collides with an active free non-scared ghost while portal blink shield is not active
- **THEN** the runtime applies Pac-Man hit behavior

#### Scenario: Scared ghost collision applies ghost-hit
- **WHEN** Pac-Man collides with an active free scared ghost
- **THEN** the runtime applies ghost-hit behavior for the colliding ghost

#### Scenario: Portal blink shield suppresses non-scared collision outcome
- **WHEN** Pac-Man collides with an active free non-scared ghost while post-portal blink shield is active
- **THEN** the runtime suppresses Pac-Man hit behavior for that tick
