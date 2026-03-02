## 1. Runtime map selection

- [x] 1.1 Keep strict env selector (`DEMO` only) and variant path resolution unchanged.
- [x] 1.2 Keep DEMO fail-fast startup error context in composition root.

## 2. Demo conversion updates

- [x] 2.1 Keep TMX/TSX conversion source (`demo.tmx` + `tileset.tsx`) and gid flag preservation.
- [x] 2.2 Keep pacman tile collision source by local id for converted demo tiles.
- [x] 2.3 Force converted demo tile semantic flags `portal=false` and `penGate=false`.
- [x] 2.4 Regenerate and commit `public/assets/mazes/default/demo.json`.

## 3. Portal inference improvements

- [x] 3.1 Implement two-stage portal candidate selection (interior-door preferred, boundary fallback).
- [x] 3.2 Ensure per-side deterministic center-most candidate tie-break.
- [x] 3.3 Clear existing parsed portal flags before inferred assignment.
- [x] 3.4 Keep void-leak hardening for non-portal tiles.

## 4. Jail/spawn fallback inference improvements

- [x] 4.1 Infer pen-gate anchor only from contiguous same-row runs length >= 3.
- [x] 4.2 Add structural jail-row inference from centered, interior, uniform local-id runs.
- [x] 4.3 Score structural candidates deterministically (lower-half, centered, rarer tile ids).
- [x] 4.4 Keep Pac-Man fallback one tile above inferred jail center with PACMAN-marker guard.

## 5. Tests and verification

- [x] 5.1 Update `demoMapContract` assertions for exact demo portal/jail/spawn anchors.
- [x] 5.2 Add demo fixture mechanics assertion for outward portal teleport without void leak.
- [x] 5.3 Keep default map portal determinism/no-void-leak tests passing.
- [x] 5.4 Run gates: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`.
