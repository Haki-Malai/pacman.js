## Context

Demo map conversion currently mixes collision sources from `demo.tmx`, `tileset.tsx`, `pacman.json`, and `maze.json`. That mixed-source flow allows collision signature drift in `public/assets/mazes/default/demo.json`, which is the runtime map artifact and directly affects traversal behavior.

The runtime itself should stay unchanged; the fix belongs in map authoring and conversion guarantees.

## Goals / Non-Goals

**Goals:**

- Make `public/assets/mazes/tileset.tsx` the canonical collision metadata source for demo conversion.
- Enforce fail-fast conversion errors when used tile IDs are missing or required collision properties are incomplete.
- Keep current runtime loading path (`demo.json`) and existing parser/system architecture.
- Add regression coverage that proves TSX-to-demo collision parity and interior wall blocking determinism.

**Non-Goals:**

- Loading TSX/TMX at runtime.
- Reworking movement, portal, or jail runtime algorithms.
- Introducing new runtime public APIs.

## Decisions

1. Canonical collision metadata is read from TSX tile properties.
Alternative considered: keep `pacman.json` as collision fallback. Rejected because fallback is the current drift vector.

2. Conversion validates every used local tile ID in `demo.tmx` against TSX metadata.
Required properties per used tile are: `collides`, `up`, `down`, `left`, `right`, `penGate`, `portal`.
Alternative considered: warning-only validation. Rejected because silent fallback still ships bad maps.

3. Converted `demo.json` tile collision properties are emitted directly from canonical TSX rules.
`penGate` and `portal` remain authored metadata values from TSX, while runtime inference remains authoritative for dynamic portal endpoint assignment.
Alternative considered: always forcing `penGate/portal` to false. Rejected because it discards authored metadata and hides data quality issues.

4. Existing conversion behavior for trim bounds, chunk flattening, and gid/flip preservation is retained.
Alternative considered: rewrite conversion around runtime parser output. Rejected as unnecessary scope and higher risk.

5. Contract tests become the quality gate for canonical collision parity and demo traversal blocking.
Alternative considered: snapshot-only JSON checks. Rejected because behavior-level blocking regressions can pass snapshot checks.

## Risks / Trade-offs

- [Risk] TSX metadata omissions will block conversion for newly authored maps.
  → Mitigation: fail messages enumerate unknown IDs and missing properties precisely.

- [Risk] Strict metadata parity may expose pre-existing map inconsistencies.
  → Mitigation: regenerate `demo.json` immediately in this change and keep tests as guardrails.

- [Risk] Behavior assertions tied to specific demo geometry can become brittle.
  → Mitigation: assert stable representative blocked transitions rather than broad full-map hardcoded matrices.
