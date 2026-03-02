# jail-release-and-pause-feedback Specification

## Purpose
TBD - created by archiving change merge-pr3-collectibles-ghost-release. Update Purpose after archive.
## Requirements
### Requirement: Ghost release scheduling is staged with delay and interval cadence
The runtime SHALL schedule ghost release using an initial jail delay and per-ghost interval spacing so releases remain staggered instead of simultaneous.

#### Scenario: Release timers are staggered
- **WHEN** ghost release scheduling starts with multiple jailed ghosts
- **THEN** the first release occurs after base delay and each subsequent release occurs after one additional configured interval

### Requirement: Ghosts align to release lane with deterministic tie-breaking
Before crossing the jail upper gate, a releasing ghost MUST follow a deterministic side-staged path: move to the side-center jail tile, then route to a collision-valid gate column, and only then cross upward out of jail.

#### Scenario: Side staging alternates deterministically by release order
- **WHEN** consecutive ghosts begin release in the same session
- **THEN** side staging alternates left then right using jail `minX`/`maxX` center targets before gate crossing

#### Scenario: Gate-column selection is deterministic and collision-safe
- **WHEN** the preferred-side gate column is blocked
- **THEN** release picks the nearest deterministic collision-valid gate column by scanning from preferred side toward center

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

### Requirement: Pause state presents overlay and scene treatment while simulation is paused
When simulation is paused, the runtime SHALL show pause presentation feedback, and SHALL remove that presentation when simulation resumes.

#### Scenario: Pause overlay follows runtime pause state
- **WHEN** runtime transitions between paused and resumed states
- **THEN** pause overlay/scene treatment is visible only during pause and is removed after resume

### Requirement: Scared ghost warning alternates between scared and base color deterministically
During the final warning window of scared mode, the runtime SHALL alternate ghost visuals between the scared (blue) sprite and that ghost's base sprite color using deterministic cadence progression.

#### Scenario: Warning alternation starts at scared-window threshold
- **WHEN** a ghost remains scared and the remaining scared time reaches the configured warning duration
- **THEN** that ghost starts alternating between scared and base-color visuals

#### Scenario: Warning alternation cadence and termination are deterministic
- **WHEN** update ticks advance through the warning window
- **THEN** visual alternation uses configured deterministic cadence progression and ends when scared mode expires

### Requirement: Jail upper gate traversal is single-pass per release cycle
Ghost movement SHALL treat the jail upper gate as locked during normal/free roaming, and SHALL permit traversal only during the dedicated release crossing phase for that release cycle.

#### Scenario: Free ghost cannot re-enter or recross jail gate
- **WHEN** a ghost has completed release and is in free movement state
- **THEN** movement across pen-gate edges is blocked for that ghost during normal movement updates

#### Scenario: Re-jail then re-release grants one new gate pass
- **WHEN** a ghost returns to jail and later starts a new release cycle
- **THEN** the ghost is allowed exactly one pen-gate crossing during that new release cycle

### Requirement: Release movement preserves speed and collision validity
Release path movement SHALL use normal ghost speed and collision-validated stepping, so ghosts do not overlap blocked wall space during release transitions.

#### Scenario: Release uses unchanged ghost speed
- **WHEN** a ghost moves through side staging and gate crossing phases
- **THEN** per-tick displacement uses that ghost's configured speed without release-specific speed boosts

#### Scenario: Release path does not overlap blocked walls
- **WHEN** release movement advances toward side center and gate crossing targets
- **THEN** movement only advances through collision-valid edges and does not tween through blocked wall tiles

