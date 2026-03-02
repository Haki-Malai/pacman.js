# runtime-map-selection Specification

## Purpose
TBD - created by archiving change add-demo-map-env-selection. Update Purpose after archive.
## Requirements
### Requirement: Runtime map variant selection is deterministic from environment
The runtime SHALL resolve map variant selection from `VITE_GAME_ENV` such that only the exact value `DEMO` selects demo mode, and all other values select the default map variant.

#### Scenario: Exact DEMO value selects demo variant
- **WHEN** `VITE_GAME_ENV` is `DEMO`
- **THEN** the runtime map variant resolves to `demo`

#### Scenario: Non-DEMO values select default variant
- **WHEN** `VITE_GAME_ENV` is missing or any value other than `DEMO`
- **THEN** the runtime map variant resolves to `default`

### Requirement: Map variant resolves runtime map and tile asset paths
The runtime SHALL map each variant to an explicit map JSON path and tile base asset path.

#### Scenario: Demo variant resolves demo map path
- **WHEN** runtime map variant is `demo`
- **THEN** map JSON path is `assets/mazes/default/demo.json` and tile base path is `assets/mazes/default`

#### Scenario: Default variant resolves production map path
- **WHEN** runtime map variant is `default`
- **THEN** map JSON path is `assets/mazes/default/maze.json` and tile base path is `assets/mazes/default`

### Requirement: Demo mode fails fast on demo map load failures
When demo variant is selected, map loading/parsing failures SHALL fail startup with explicit demo-context error messaging.

#### Scenario: Demo map load failure surfaces explicit startup context
- **WHEN** runtime map variant is `demo` and loading/parsing `assets/mazes/default/demo.json` fails
- **THEN** startup throws an error that explicitly indicates DEMO map startup failure and references the demo map path

### Requirement: Missing spawn metadata is inferred deterministically from map geometry
When map spawn objects are missing, runtime SHALL infer ghost jail bounds and Pac-Man fallback spawn deterministically from parsed map geometry.

#### Scenario: Pen-gate band is present
- **WHEN** a contiguous same-row pen-gate run of length 3 or more exists
- **THEN** runtime uses that band to infer jail anchor and ghost jail bounds

#### Scenario: Pen-gate band is absent
- **WHEN** no qualifying pen-gate band exists
- **THEN** runtime infers jail anchor from centered interior uniform-row geometry and places Pac-Man one tile above inferred jail center

