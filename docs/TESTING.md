# Testing

This file is the single documentation entrypoint for the mechanics testing system.

## Purpose
- Validate game mechanics without UI assertions.
- Keep checks deterministic and replayable for humans and agents.
- Enforce blocking mechanics quality gates in CI.

## Source of truth files
Mechanics behavior definitions are machine-readable and live in:
- `tests/specs/mechanics.spec.json`
- `tests/specs/mechanics.roadmap.json`
- `tests/specs/mechanics.diagnostics.json`

## Mechanics execution model
- Domain-first harness validates movement, ghost behavior, jail/release, portals, animation, and scheduler interactions.
- Runtime harness validates update ordering and pause/resume behavior with node stubs.
- Fuzz suites run with deterministic seeds and emit repro bundles on failure.

## What to run

### Fast local mechanics check
```bash
pnpm run test:mechanics
```

### Heavy deterministic fuzzing
```bash
pnpm run test:mechanics:fuzz
```

### Coverage gate for mechanics-critical modules
```bash
pnpm run test:mechanics:coverage
pnpm run check:mechanics:coverage
```

### Full CI-equivalent mechanics gate
```bash
pnpm run test:mechanics:ci
```

## Targeted replay/debug runs
Run one invariant/scenario with a fixed seed:
```bash
MECHANICS_SCENARIO_ID=INV-BOUNDS-001 MECHANICS_SEED=12345 pnpm vitest run src/__tests__/mechanics/fuzzInvariants*.mechanics.test.ts
```

Useful env vars:
- `MECHANICS_SCENARIO_ID`
- `MECHANICS_SEED`
- `MECHANICS_FUZZ_RUNS`
- `MECHANICS_FUZZ_MULTIPLIER`
- `MECHANICS_FUZZ_TICKS`

## Failure bundles and triage
On mechanics assertion failure, repro bundles are written to:
- `logs/mechanics/*.json`

Use triage tooling:
```bash
pnpm run triage:mechanics
```

Or for a specific bundle:
```bash
pnpm run triage:mechanics logs/mechanics/<bundle-file>.json
```

## Updating mechanics tests when behavior changes
1. Update scenario/invariant definitions in `tests/specs/mechanics.spec.json`.
2. Update roadmap placeholders in `tests/specs/mechanics.roadmap.json` as needed.
3. Update diagnostics mappings in `tests/specs/mechanics.diagnostics.json`.
4. Update/add executable tests in `src/__tests__/mechanics/`.
5. Run `pnpm run test:mechanics:ci`.
