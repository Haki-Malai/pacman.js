## MODIFIED Requirements

### Requirement: Post-portal Pac-Man visibility blink is time-bounded and deterministic
After successful portal teleport, Pac-Man visibility SHALL blink for a fixed duration using deterministic interval phase calculation, then return to normal visibility. That same blink window SHALL act as a collision shield for non-scared ghost collisions while still allowing scared ghost collisions to resolve as ghost-hit. During active gameplay, portal endpoint handling SHALL NOT allow movement leakage into map void or out-of-bounds tiles when outward input is held at endpoint tiles.

#### Scenario: Blink window starts on teleport and resets on expiry
- **WHEN** Pac-Man teleports through a portal and subsequent ticks advance
- **THEN** blink timing starts immediately, visibility toggles by configured interval, and blink state clears when duration reaches zero

#### Scenario: Blink window suppresses non-scared collision effects
- **WHEN** Pac-Man collides with an active free non-scared ghost during active post-portal blink window
- **THEN** no Pac-Man hit behavior is applied for that tick

#### Scenario: Blink window still permits scared ghost-hit behavior
- **WHEN** Pac-Man collides with an active free scared ghost during active post-portal blink window
- **THEN** ghost-hit behavior is applied for the colliding ghost

#### Scenario: Portal endpoint outward input does not leak outside playable maze
- **WHEN** Pac-Man is centered on a default-map portal endpoint and outward movement input is applied
- **THEN** Pac-Man does not enter map void or out-of-bounds tiles, and portal transfer resolves using the endpoint pair
