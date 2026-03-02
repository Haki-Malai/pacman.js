## 1. OpenSpec and release-model setup

- [x] 1.1 Finalize proposal/design/spec delta for single-pass side-staged jail release behavior.
- [x] 1.2 Update movement actor typing and movement-rule pen-gate semantics to split normal ghost movement from release-only traversal.

## 2. Runtime implementation

- [x] 2.1 Refactor `GhostReleaseSystem` from tween-based release to deterministic phase-based movement (`to_side_center`, `to_gate_column`, `cross_gate_once`, `complete`) while preserving timer cadence.
- [x] 2.2 Implement deterministic alternating side selection (left-first) and collision-safe gate-column fallback scanning.
- [x] 2.3 Ensure release completion/cleanup keeps existing jail lifecycle compatibility (including re-jail then re-release behavior) and keeps normal/free ghosts gate-locked.

## 3. Verification and contract alignment

- [x] 3.1 Update movement and systems coverage tests to validate single-pass gate lock, side alternation, and collision-valid release movement without tween assumptions.
- [x] 3.2 Extend jail/mechanics scenarios and contract catalogs for single-pass reset, alternating side path, and wall-overlap prevention expectations.
- [x] 3.3 Run full completion gates (`pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`) and mark all tasks complete.
