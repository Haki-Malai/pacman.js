## MODIFIED Requirements

### Requirement: Ghost and Pac-Man contact is detected deterministically in tile space
The runtime SHALL detect ghost/Pac-Man contact when Pac-Man and an active free ghost have overlapping opaque sprite pixels in world space during a tick. Collision evaluation MUST use current animation frame masks and active render transforms (rotation and flip), and MUST resolve the first matching collision in deterministic ghost iteration order.

#### Scenario: Opaque sprite overlap triggers collision
- **WHEN** Pac-Man and an active free ghost have at least one overlapping opaque pixel in the same tick
- **THEN** the collision flow is triggered for that tick

#### Scenario: Adjacent-tile overlap still triggers collision
- **WHEN** Pac-Man and an active free ghost occupy adjacent tiles but their transformed sprite masks overlap in world space
- **THEN** the collision flow is triggered for that tick

#### Scenario: Tile swap without pixel overlap does not trigger collision
- **WHEN** Pac-Man and an active free ghost swap tiles within one tick but no opaque sprite pixels overlap
- **THEN** no collision flow is triggered for that tick
