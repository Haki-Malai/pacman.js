## Context

The initial dynamic implementation still allowed converted demo tile metadata (`portal`/`penGate`) to leak static semantics into runtime, and portal/jail inference rules were too narrow for the authored demo geometry.

This design keeps TMX-faithful conversion and makes anchor selection deterministic from geometry.

## Goals / Non-Goals

**Goals**
- Preserve strict env map selection and DEMO fail-fast behavior.
- Keep demo conversion based on `demo.tmx` + `tileset.tsx` with preserved gid transform flags.
- Ensure runtime infers demo portals at intended middle outer doors.
- Ensure missing spawn metadata infers jail bounds and Pac-Man fallback deterministically.
- Avoid reintroducing fixed coordinate logic.

**Non-Goals**
- Full inner-wall collision parity tuning in this change set.
- Runtime TMX loading.
- Gameplay/system-order changes.

## Decisions

1. **Converter keeps pacman collision edges but strips static semantic flags**
- Source of collision edges/collides remains `pacman.json` by tile id.
- Emitted `portal` and `penGate` are forced to `false` in converted demo output.

2. **Portal inference is two-stage and side-aware**
- Stage A (preferred): interior-door candidates on `x=1`, `x=width-2`, `y=1`, `y=height-2`.
- Candidate eligibility:
  - non-empty,
  - not fully blocking (`collides && up && right && down && left`),
  - adjacent outer-ring tile exists and leaks outward for that side.
- Stage B (fallback): boundary walkable+void candidates (legacy behavior) for sides missing Stage A candidates.
- Selection per side is center-most with deterministic tie-break.
- Pairing remains opposite-side only (`left<->right`, `top<->bottom`).
- Parser clears all `portal` flags before applying inferred endpoints.

3. **Jail inference uses deterministic fallback chain**
- Primary fallback: pen-gate band inference only from contiguous same-row runs length >= 3.
- Secondary fallback: structural uniform row inference:
  - contiguous same-`localId` run,
  - length >= 3,
  - inside envelope (not on border),
  - deterministic scoring favors lower-half, center-aligned, rarer tile-id runs.
- Pac-Man fallback spawn = one tile above inferred jail center.
- PACMAN-marker guard: if marker row is detected and spawn is not below it, shift down to `markerY+1` while staying above jail.

4. **Existing parser trim/rebase and collectibles behavior remain unchanged**
- Outer void trim and object property rebase remain active.
- `Dots` object layer remains first-choice collectible source.

## Risks / Trade-offs

- Structural jail inference may choose the wrong row on highly unusual layouts.
  - Mitigation: deterministic scoring and tests for demo + default map no-regression.
- Interior-door portal candidates could be absent on some maps.
  - Mitigation: side-level fallback to boundary candidate logic.

## Verification Plan

- Contract test exact demo portal anchors and inferred spawn/jail bounds.
- Mechanics test demo outward portal teleport/no-void-leak behavior.
- Keep default map portal determinism tests passing.
- Run `typecheck`, `lint`, `test`, and `spec:check`.
