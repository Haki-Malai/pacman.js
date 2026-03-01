## MODIFIED Requirements

### Requirement: Scared ghost warning alternates between scared and base color deterministically
During the final warning window of scared mode, the runtime SHALL alternate ghost visuals between the scared (blue) sprite and that ghost's base sprite color using deterministic cadence progression.

#### Scenario: Warning alternation starts at scared-window threshold
- **WHEN** a ghost remains scared and the remaining scared time reaches the configured warning duration
- **THEN** that ghost starts alternating between scared and base-color visuals

#### Scenario: Warning alternation cadence and termination are deterministic
- **WHEN** update ticks advance through the warning window
- **THEN** visual alternation uses configured deterministic cadence progression and ends when scared mode expires
