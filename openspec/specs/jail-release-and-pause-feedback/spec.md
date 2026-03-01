# jail-release-and-pause-feedback Specification

## Purpose
TBD - created by archiving change merge-pr3-collectibles-ghost-release. Update Purpose after archive.
## Requirements
### Requirement: Ghost release scheduling is staged with delay and interval cadence
The runtime SHALL schedule ghost release using an initial jail delay and per-ghost interval spacing so releases are staggered instead of simultaneous.

#### Scenario: Release timers are staggered
- **WHEN** ghost release scheduling starts with multiple jailed ghosts
- **THEN** the first release occurs after base delay and each subsequent release occurs after one additional configured interval

### Requirement: Ghosts align to release lane with deterministic tie-breaking
Before upward exit, releasing ghosts MUST align to a valid release lane tile, and tie-breaking MUST be deterministic with optional preferred direction support.

#### Scenario: Alignment and preferred-direction resolution are deterministic
- **WHEN** a ghost begins release while off-lane or with ambiguous lane candidates
- **THEN** the ghost aligns to a deterministic lane choice, respects preferred direction when provided, and only then starts the exit tween

### Requirement: Post-portal Pac-Man visibility blink is time-bounded and deterministic
After successful portal teleport, Pac-Man visibility SHALL blink for a fixed duration using deterministic interval phase calculation, then return to normal visibility. That same blink window SHALL act as a collision shield for non-scared ghost collisions while still allowing scared ghost collisions to resolve as ghost-hit. The production default map SHALL expose deterministic horizontal and vertical portal endpoint pairs so portal behavior is reachable in both tunnel axes during normal runtime play.

#### Scenario: Blink window starts on teleport and resets on expiry
- **WHEN** Pac-Man teleports through a portal and subsequent ticks advance
- **THEN** blink timing starts immediately, visibility toggles by configured interval, and blink state clears when duration reaches zero

#### Scenario: Blink window suppresses non-scared collision effects
- **WHEN** Pac-Man collides with an active free non-scared ghost during active post-portal blink window
- **THEN** no Pac-Man hit behavior is applied for that tick

#### Scenario: Blink window still permits scared ghost-hit behavior
- **WHEN** Pac-Man collides with an active free scared ghost during active post-portal blink window
- **THEN** ghost-hit behavior is applied for the colliding ghost

#### Scenario: Production map exposes deterministic portal endpoint pairs
- **WHEN** the default production maze is parsed into runtime collision data
- **THEN** exactly four portal endpoints are present as two deterministic pairs: horizontal `(1,26) <-> (49,26)` and vertical `(25,1) <-> (25,49)`

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

