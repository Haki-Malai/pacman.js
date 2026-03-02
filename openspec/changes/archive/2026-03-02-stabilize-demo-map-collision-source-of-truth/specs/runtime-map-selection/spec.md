## ADDED Requirements

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
