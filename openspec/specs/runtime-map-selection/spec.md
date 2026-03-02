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

### Requirement: Demo map collision metadata conversion is canonical and strict
The project SHALL generate `assets/mazes/default/demo.json` collision metadata from canonical tile properties defined in `assets/mazes/tileset.tsx`, and generation MUST fail when any used tile ID is missing or lacks required collision properties (`collides`, `up`, `down`, `left`, `right`, `penGate`, `portal`).

#### Scenario: Used tile ID missing in canonical tileset fails conversion
- **WHEN** `demo.tmx` references a local tile ID that does not exist in `tileset.tsx`
- **THEN** demo conversion fails with an error that lists the missing tile ID

#### Scenario: Missing required collision property fails conversion
- **WHEN** a used tile ID exists in `tileset.tsx` but does not define all required collision properties
- **THEN** demo conversion fails with an error that lists the tile ID and missing property names

### Requirement: Converted demo map preserves canonical collision signatures
For every tile ID used by the converted demo map, the emitted collision properties in `assets/mazes/default/demo.json` SHALL exactly match canonical collision properties authored in `assets/mazes/tileset.tsx`.

#### Scenario: Canonical collision parity is preserved in output
- **WHEN** demo conversion succeeds
- **THEN** each used tile ID in `demo.json` has collision values equal to its canonical `tileset.tsx` collision properties

