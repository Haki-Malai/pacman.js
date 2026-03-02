## Why

The demo map now visually matches authored Tiled layout, but runtime anchor inference still misplaces jail, Pac-Man fallback spawn, and portal endpoints under missing spawn metadata.

We need deterministic runtime inference rules that match authored geometry without hardcoded coordinates, while preserving strict `VITE_GAME_ENV=DEMO` map selection and fail-fast startup behavior.

## What Changes

- Keep env-driven map routing unchanged (`DEMO` selects `demo`, everything else selects `default`).
- Keep TMX/TSX demo conversion flow, but force converted demo tile metadata to emit `portal=false` and `penGate=false` so runtime inference owns those semantics.
- Refactor portal inference to two-stage deterministic selection:
  - Stage A: interior-door candidates one tile inside each side.
  - Stage B: boundary fallback candidates only when Stage A is absent for that side.
- Reset all parsed tile `portal` flags before inference, then mark inferred endpoints only.
- Replace fragile jail inference with deterministic fallback order:
  - pen-gate contiguous band (length >= 3), else
  - structural centered uniform run inference (same localId, length >= 3, inside envelope), favoring lower-half, centered, rarer runs.
- Pac-Man fallback remains one tile above inferred jail center, with optional PACMAN-marker-row guard.
- Keep parser trim/rebase and `Dots`-first collectible behavior unchanged.

## Capabilities

### Modified Capabilities
- `runtime-map-selection`
  - Clarifies deterministic portal endpoint inference from center-most outer doors with interior-door preference.
  - Clarifies spawn/jail fallback inference when explicit metadata is missing.
- `jail-release-and-pause-feedback`
  - Keeps behavioral guarantee wording coordinate-agnostic and geometry-driven.

## Impact

- Code: `scripts/convert-demo-map.mjs`, `src/game/infrastructure/map/TiledParser.ts`, `src/game/domain/services/GhostJailService.ts`, and tests.
- Assets: regenerated `public/assets/mazes/default/demo.json`.
- No new public API changes.
