# AGENTS.md

Instructions for **Codex** when editing this repository.

This repo is a small Vite + TypeScript game project (Phaser). Keep changes tight, readable, and type-safe.

## Architecture reference

- Read `docs/ARCHITECTURE.md` before making structural/runtime changes. It documents the layered design (`app`, `domain`, `systems`, `infrastructure`, `shared`), dependency rules, system order, and quality gates.

## Commands

Use pnpm scripts (prefer `npm run <script>`):

- Dev server: `pnpm run dev`
- Production build: `pnpm run build`
- Tests: `pnpm run test` (Vitest)
- Type check: `pnpm run typecheck` (must be clean)
- Lint: `pnpm run lint` (must be clean, zero warnings)
- Lint autofix: `pnpm run lint:fix`
- Format: `pnpm run format` (Prettier)

## Mechanics test quick guide

For day-to-day mechanics validation (no UI assertions):
- quick mechanics suite: `pnpm run test:mechanics`
- heavy mechanics fuzzing: `pnpm run test:mechanics:fuzz`
- mechanics coverage + thresholds: `pnpm run test:mechanics:coverage` then `pnpm run check:mechanics:coverage`
- full blocking mechanics gate (same as CI): `pnpm run test:mechanics:ci`
- investigate a failure bundle: `pnpm run triage:mechanics` (or pass a bundle path)

Full usage/reference doc: `docs/TESTING.md`

## Engineering priorities

1. Correct behavior (tests pass)
2. Smallest viable change (least code that solves the task)
3. Clarity (future readers should follow intent quickly)
4. Performance only when needed (no speculative tuning)

## “Write less, keep behavior” rules

- Prefer deleting or simplifying over adding layers.
- Avoid new abstractions unless they remove real duplication.
- Keep public APIs stable unless the task explicitly changes them.
- Verify usage before removing exports or files (search/grep first).
- Do not “cleanup” unrelated code. Fix only what the task requires.

## Mandatory workflow (do not skip)

### Before starting work

1. Run `pnpm run typecheck` and confirm **0 errors**
2. Run `pnpm run test` and confirm **all tests pass**
3. Only proceed if both are green

### While implementing

- After roughly every small chunk of edits (about 10–20 lines), run `pnpm run typecheck`.
- If type errors appear, stop feature work and fix them immediately.
- Do not let errors pile up.

### After finishing a unit of work (function/component/feature)

1. `pnpm run typecheck`
2. `pnpm run test`

### Completion gate (required)

Before calling the task “done”, all of the following must pass with zero issues:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`

If any fail, fix and re-run until clean.

## Behavior Contract Workflow (OpenSpec)

- `openspec/specs/` is the authoritative source for approved product behavior and governance capabilities.
- `openspec/changes/` contains proposed behavior deltas (`proposal.md`, `design.md`, `specs/`, `tasks.md`) before implementation and archive.
- Keep OpenSpec capability specs human-readable and product-facing (written for product owner/designer audiences, not code-level implementation detail).
- If a change may alter behavior or decision logic:
  - Present a **Proposed Behavior Delta** first.
  - Request explicit user approval before code edits.
- If a change is behavior-preserving (refactor/cleanup only):
  - Pre-approval is not required.
  - Post-change spec integrity check is still required.
- Mandatory post-change sequence:
  - Run `pnpm run typecheck`.
  - Run `pnpm run lint`.
  - Run `pnpm run test`.
  - Run `pnpm run spec:check`.
  - Reconcile resulting behavior with relevant OpenSpec capability specs.
  - If any ambiguity remains, stop and ask the user before proceeding.
- Final report must explicitly state:
  - whether behavior changed,
  - whether OpenSpec specs or change artifacts were updated,
  - whether any uncertainty remains.

## TypeScript standards (strict)

### No `any` by default

- Do not use `as any` in production code.
- Use `unknown` for untrusted inputs and narrow with guards.

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
```

## Prefer real types over casts

### When integrating with Phaser or Tiled data, model what we actually read.
```ts
interface TileProps {
  collides?: boolean;
  blocksUp?: boolean;
  blocksDown?: boolean;
  blocksLeft?: boolean;
  blocksRight?: boolean;
}

function getTileProps(raw: unknown): TileProps {
  if (!isRecord(raw)) return {};
  return raw as TileProps;
}
```

## Defensive access
  - Guard optional values before use.
  - In tests, non-null assertions are acceptable only when the fixture guarantees presence.

```ts
if (results[0]?.content?.[0]?.text) {
  // safe
}
```

`exactOptionalPropertyTypes`

When a property is optional, only assign it when you have a real value.
```ts
type Node = { value: string; language?: string };

function makeNode(value: string, language?: string): Node {
  const node: Node = { value };
  if (language !== undefined) node.language = language;
  return node;
}
```

## Testing expectations
  - New logic should ship with tests where it makes sense.
  - Prefer unit tests for pure helpers (movement, collision rules, utility functions).
  - Keep tests deterministic (avoid randomness unless explicitly controlled/mocked).

## Refactors and migrations (clean breaks)

When changing module boundaries or APIs:
  - Create the new version
  - Update every import/caller
  - Delete the old version
Do not add compatibility shims or re-export bridges. They hide dependencies and increase maintenance.

## Common failure patterns to avoid
  - Just cast it” fixes that hide type problems
  - Adding wrapper functions that only forward arguments
  - Spreading game logic across many tiny files without payoff
  - Unverified deletions (always search for references first)
