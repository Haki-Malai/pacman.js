## MODIFIED Requirements

### Requirement: Ghost-hit applies chain scoring and jail return flow
When ghost-hit behavior is applied, the runtime SHALL award chain-based points, teleport the eaten ghost to jail return tile, set it non-free immediately, and requeue it into the standard jail wait/roam/release flow.

#### Scenario: Ghost-hit awards chain score and teleports ghost to jail
- **WHEN** Pac-Man collides with a scared active ghost
- **THEN** score increases by current chain value and the ghost is moved to jail return tile in non-free state

#### Scenario: Eaten ghost resumes map play through normal jail lifecycle
- **WHEN** an eaten ghost has been returned to jail
- **THEN** it waits/roams in jail and is released back to map movement through the existing staged release behavior rather than free-in-place delay
