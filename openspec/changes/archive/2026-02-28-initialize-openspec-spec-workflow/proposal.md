## Why

The project currently relies on root-level `SPECIFICATIONS.md` and `ROADMAP.md`, which are not integrated with OpenSpec’s artifact lifecycle and validation flow. Moving to OpenSpec-first specs now gives a single, tool-backed workflow for proposing, implementing, validating, and archiving behavior changes.

## What Changes

- Replace legacy root spec authority with OpenSpec capabilities under `openspec/specs/*`.
- Seed a concise OpenSpec gameplay contract that captures implemented behavior and roadmap boundaries.
- Define OpenSpec governance requirements for behavior-delta approval and verification gates.
- Remove root-level `SPECIFICATIONS.md` and `ROADMAP.md`.
- Repoint `pnpm run spec:check` to OpenSpec validation while keeping the script name stable.
- Update contributor guidance in `AGENTS.md` and `README.md` to reference OpenSpec workflows and paths.

## Capabilities

### New Capabilities
- `gameplay-contract`: Normative, concise gameplay requirements for current implemented mechanics and explicit not-yet-implemented roadmap boundaries.
- `spec-governance`: Workflow and verification requirements for how behavior changes are proposed, reviewed, validated, and reported.

### Modified Capabilities
- None.

## Impact

- Affected docs: `AGENTS.md`, `README.md`.
- Affected tooling: `scripts/check-specifications.mjs` (`spec:check` behavior changes to OpenSpec validation).
- Removed files: `SPECIFICATIONS.md`, `ROADMAP.md`.
- No gameplay/runtime API changes; existing mechanics fixture JSON under `tests/specs/*.json` remains intact.
