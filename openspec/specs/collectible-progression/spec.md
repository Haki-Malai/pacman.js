# collectible-progression Specification

## Purpose
TBD - created by archiving change merge-pr3-collectibles-ghost-release. Update Purpose after archive.
## Requirements
### Requirement: Deterministic collectible layout from traversable topology
The gameplay runtime SHALL build collectible layout from traversable, reachable topology starting from a valid traversal start tile, and SHALL exclude unreachable areas.

#### Scenario: Layout is built only from reachable traversable topology
- **WHEN** collectible layout generation runs for a maze with mixed reachable and unreachable traversable tiles
- **THEN** base collectible tiles are emitted only for reachable traversable tiles and unreachable traversable tiles are excluded

### Requirement: Non-playable and void-facing tiles are excluded from collectible spawn
The gameplay runtime SHALL NOT place collectibles on non-playable tiles, including `gid: null` tiles, pen-gate tiles, and tiles that open directly into map void through a navigable edge.

#### Scenario: Border leakage and non-playable tiles are prevented
- **WHEN** collectible layout generation evaluates border-adjacent and non-playable tiles
- **THEN** no collectible is spawned on void-facing leak tiles, `gid: null` tiles, or pen-gate tiles

### Requirement: Power points are a deterministic subset of base points
For a fixed map topology and seed, the runtime MUST select power points as a deterministic subset of base points.

#### Scenario: Seed-stable power-point selection
- **WHEN** collectible layout is generated multiple times with the same map and seed
- **THEN** the selected power-point tile set is identical across runs and each power point belongs to the base-point set

### Requirement: Collectible consumption requires centered tile overlap
The runtime MUST consume a collectible only when Pac-Man is on the same tile and centered at the collectible world position within configured tolerance.

#### Scenario: Off-center movement does not consume collectibles
- **WHEN** Pac-Man is on or passing through a collectible tile but is not centered on the collectible world position
- **THEN** the collectible remains active and score does not change

### Requirement: Collectible consumption drives score and finite eat feedback
When a collectible is consumed, the runtime SHALL increment score by collectible type, trigger Pac-Man eat animation playback, and emit a finite-duration eat effect that is removed when its duration elapses.

#### Scenario: Consumption applies score and event-driven feedback
- **WHEN** Pac-Man consumes a base or power collectible at a centered overlap
- **THEN** score increases by configured value, Pac-Man eat playback starts, and the eat effect appears then expires after its configured duration

