# gameplay-contract Specification

## Purpose
TBD - created by archiving change initialize-openspec-spec-workflow. Update Purpose after archive.
## Requirements
### Requirement: Implemented Gameplay Mechanics Contract
The project SHALL define implemented gameplay mechanics as a normative contract in OpenSpec capability specs, and those requirements MUST describe currently implemented runtime behavior only.

#### Scenario: Implemented baseline is documented as normative requirements
- **WHEN** contributors inspect the gameplay contract capability
- **THEN** they find explicit SHALL/MUST requirements for the current implemented mechanics baseline

### Requirement: Roadmap Mechanics Are Explicitly Not Implemented
The gameplay contract SHALL explicitly separate roadmap mechanics from implemented mechanics, and roadmap behavior MUST be identified as not yet implemented.

#### Scenario: Planned behavior is not treated as current behavior
- **WHEN** a contributor reviews future mechanics expectations
- **THEN** roadmap-only behavior is clearly labeled as not implemented and excluded from current behavior guarantees

