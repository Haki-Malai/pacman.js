## MODIFIED Requirements

### Requirement: Post-portal Pac-Man visibility blink is time-bounded and deterministic
After successful portal teleport, Pac-Man visibility SHALL blink for a fixed duration using deterministic interval phase calculation, then return to normal visibility. That same blink window SHALL act as a collision shield for non-scared ghost collisions while still allowing scared ghost collisions to resolve as ghost-hit. The production default map SHALL provide a deterministic portal endpoint pair so this teleport-and-blink flow is reachable during normal runtime play.

#### Scenario: Blink window starts on teleport and resets on expiry
- **WHEN** Pac-Man teleports through a portal and subsequent ticks advance
- **THEN** blink timing starts immediately, visibility toggles by configured interval, and blink state clears when duration reaches zero

#### Scenario: Blink window suppresses non-scared collision effects
- **WHEN** Pac-Man collides with an active free non-scared ghost during active post-portal blink window
- **THEN** no Pac-Man hit behavior is applied for that tick

#### Scenario: Blink window still permits scared ghost-hit behavior
- **WHEN** Pac-Man collides with an active free scared ghost during active post-portal blink window
- **THEN** ghost-hit behavior is applied for the colliding ghost

#### Scenario: Production map exposes deterministic portal endpoints
- **WHEN** the default production maze is parsed into runtime collision data
- **THEN** exactly two portal endpoints are present at deterministic tunnel tiles that form one portal pair
