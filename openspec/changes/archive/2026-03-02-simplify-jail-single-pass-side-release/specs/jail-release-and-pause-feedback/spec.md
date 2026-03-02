## MODIFIED Requirements

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

## ADDED Requirements

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
