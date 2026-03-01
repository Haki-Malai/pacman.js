## MODIFIED Requirements

### Requirement: Implemented Gameplay Mechanics Contract
The project SHALL define implemented gameplay mechanics as a normative contract in OpenSpec capability specs, and those requirements MUST describe currently implemented runtime behavior only, including traversal safety that prevents entities from entering map void or out-of-bounds space during movement updates.

#### Scenario: Implemented baseline includes boundary-safe traversal
- **WHEN** contributors inspect the gameplay contract capability
- **THEN** they find explicit normative requirements that movement remains inside playable map bounds and excludes void traversal
