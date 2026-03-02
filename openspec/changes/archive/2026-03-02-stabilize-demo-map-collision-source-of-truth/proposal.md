## Why

`public/assets/mazes/default/demo.json` currently contains collision signatures that drift from authored tile metadata, which makes interior wall collision in the demo map unreliable. We need a single collision source of truth so newly authored Tiled maps are deterministic without manual collision debugging.

## What Changes

- Make `public/assets/mazes/tileset.tsx` the canonical source for collision metadata used by demo map conversion.
- Refactor `scripts/convert-demo-map.mjs` to read and validate collision rules from TSX tile properties.
- Remove permissive collision fallback from `pacman.json`; conversion fails fast on missing tile IDs or required collision properties.
- Regenerate `public/assets/mazes/default/demo.json` from `demo.tmx` + canonical TSX metadata.
- Add contract coverage to guarantee TSX-to-demo collision parity and representative interior wall blocking behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-map-selection`: add requirement-level guarantees that demo runtime map assets preserve deterministic collision integrity from canonical authored tile metadata.
- `gameplay-contract`: clarify that deterministic traversal safety applies to demo map variants generated from canonical tileset collision metadata.

## Impact

- Affected code: `scripts/convert-demo-map.mjs`, demo map contract tests, and related helper/test fixtures as needed.
- Affected assets: `public/assets/mazes/tileset.tsx`, `public/assets/mazes/default/demo.tmx` (if source normalization is required), and regenerated `public/assets/mazes/default/demo.json`.
- No runtime public API changes.
