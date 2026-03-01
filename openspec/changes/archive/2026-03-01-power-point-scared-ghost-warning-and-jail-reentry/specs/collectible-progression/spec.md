## ADDED Requirements

### Requirement: Power-point consumption starts deterministic scared ghost window
When Pac-Man consumes a power point, the runtime SHALL start scared mode for all active ghosts for a fixed-duration window, and SHALL reset the ghost eat chain for the new scared session.

#### Scenario: Power-point consumption applies scared state to active ghosts
- **WHEN** Pac-Man consumes a power point at centered overlap
- **THEN** each active ghost enters scared state with a fresh scared timer and warning state reset

#### Scenario: Mid-window power-point consumption refreshes scared session
- **WHEN** Pac-Man consumes another power point while one or more ghosts are already scared
- **THEN** scared timers are refreshed to full duration and ghost eat chain count resets for the new session
