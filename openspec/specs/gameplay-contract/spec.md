# gameplay-contract Specification

## Purpose
TBD - created by archiving change initialize-openspec-spec-workflow. Update Purpose after archive.
## Requirements
### Requirement: Implemented Gameplay Mechanics Contract
The project SHALL define implemented gameplay mechanics as a normative contract in OpenSpec capability specs, and those requirements MUST describe currently implemented runtime behavior only, including traversal safety that prevents entities from entering map void or out-of-bounds space during movement updates.

#### Scenario: Implemented baseline includes boundary-safe traversal
- **WHEN** contributors inspect the gameplay contract capability
- **THEN** they find explicit normative requirements that movement remains inside playable map bounds and excludes void traversal

### Requirement: Roadmap Mechanics Are Explicitly Not Implemented
The gameplay contract SHALL explicitly separate roadmap mechanics from implemented mechanics, and roadmap behavior MUST be identified as not yet implemented.

#### Scenario: Planned behavior is not treated as current behavior
- **WHEN** a contributor reviews future mechanics expectations
- **THEN** roadmap-only behavior is clearly labeled as not implemented and excluded from current behavior guarantees

### Requirement: Demo map traversal respects canonical authored collision metadata
Demo runtime traversal SHALL use collision metadata from the converted `demo.json`, and that metadata MUST originate from canonical `tileset.tsx` collision definitions so blocked interior edges remain deterministic and enforceable.

#### Scenario: Representative interior wall edge remains blocked in demo runtime map
- **WHEN** movement evaluation attempts to cross a known blocked interior edge in the demo map from tile center
- **THEN** movement is rejected at that edge according to canonical collision metadata

#### Scenario: Traversal determinism is stable across repeated loads
- **WHEN** the demo map is parsed in repeated runs without asset changes
- **THEN** interior blocked/open traversal outcomes remain identical across runs

