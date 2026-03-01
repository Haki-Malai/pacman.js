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
After successful portal teleport, Pac-Man visibility SHALL blink for a fixed duration using deterministic interval phase calculation, then return to normal visibility.

#### Scenario: Blink window starts on teleport and resets on expiry
- **WHEN** Pac-Man teleports through a portal and subsequent ticks advance
- **THEN** blink timing starts immediately, visibility toggles by configured interval, and blink state clears when duration reaches zero

### Requirement: Pause state presents overlay and scene treatment while simulation is paused
When simulation is paused, the runtime SHALL show pause presentation feedback, and SHALL remove that presentation when simulation resumes.

#### Scenario: Pause overlay follows runtime pause state
- **WHEN** runtime transitions between paused and resumed states
- **THEN** pause overlay/scene treatment is visible only during pause and is removed after resume

### Requirement: Scared ghost recovery visual crossfades to base sprite
When a ghost leaves scared state, the runtime SHALL render a deterministic recovery transition that crossfades from scared sprite to the ghost's base sprite over configured duration.

#### Scenario: Crossfade starts on scared-to-normal transition
- **WHEN** a ghost state changes from scared to non-scared
- **THEN** ghost recovery visual state starts at full scared opacity and zero base opacity

#### Scenario: Crossfade progresses and completes deterministically
- **WHEN** update ticks advance through the configured recovery duration
- **THEN** scared opacity decreases while base opacity increases until recovery visual state is cleared at completion

