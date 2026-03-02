## MODIFIED Requirements

### Requirement: Post-portal Pac-Man visibility blink is time-bounded and deterministic
After successful portal teleport, Pac-Man visibility SHALL blink for a fixed duration using deterministic interval phase calculation, then return to normal visibility. That same blink window SHALL act as a collision shield for non-scared ghost collisions while still allowing scared ghost collisions to resolve as ghost-hit. The production default map SHALL expose deterministic geometry-derived portal endpoint pairs so portal behavior is reachable through authored boundary doors during normal runtime play. Portal teleport SHALL trigger only when an entity moves in the endpoint's outward direction and reaches outward movement offset greater than or equal to half tile size from center; centered endpoint occupancy alone SHALL NOT trigger teleport. While Pac-Man is centered on a portal endpoint, buffered turn input that targets that endpoint's outward direction SHALL be applied even when normal collision checks for that turn are blocked.

#### Scenario: Blink window starts on teleport and resets on expiry
- **WHEN** Pac-Man teleports through a portal and subsequent ticks advance
- **THEN** blink timing starts immediately, visibility toggles by configured interval, and blink state clears when duration reaches zero

#### Scenario: Blink window suppresses non-scared collision effects
- **WHEN** Pac-Man collides with an active free non-scared ghost during active post-portal blink window
- **THEN** no Pac-Man hit behavior is applied for that tick

#### Scenario: Blink window still permits scared ghost-hit behavior
- **WHEN** Pac-Man collides with an active free scared ghost during active post-portal blink window
- **THEN** ghost-hit behavior is applied for the colliding ghost

#### Scenario: Portal endpoints are inferred from center-most outer doors
- **WHEN** a map is parsed into runtime collision data
- **THEN** runtime prefers one-tile-interior side-door candidates and deterministically pairs center-most opposite-side endpoints

#### Scenario: Centered outward input does not teleport immediately
- **WHEN** an entity is centered on a portal endpoint and holds the outward direction
- **THEN** teleport is not applied until outward movement offset reaches at least half tile size

#### Scenario: Half-tile outward threshold triggers teleport
- **WHEN** an entity on a portal endpoint moves outward and reaches movement offset greater than or equal to half tile size
- **THEN** teleport transfers the entity to the paired endpoint and resets movement offset to zero

#### Scenario: Outward portal progression does not leak into void before threshold
- **WHEN** an entity advances outward from a centered portal endpoint toward transfer threshold
- **THEN** the entity remains within valid map tile bounds until teleport resolves

#### Scenario: Buffered outward turn from perpendicular approach is applied at centered endpoint
- **WHEN** Pac-Man is centered on a portal endpoint with current direction perpendicular to outward direction and buffered next direction set to that outward direction
- **THEN** Pac-Man turns into the outward direction on that tick and begins outward movement toward teleport threshold
