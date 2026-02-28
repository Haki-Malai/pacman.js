## Context

This change integrates the PR3 gameplay subset from `origin/stack/pr3-gameplay-collectibles-ghost` commit range `c3a5ff7..b0e5498` onto current `main`. The source branch is stacked on PR1/PR2 history, while current `main` has already diverged in docs/tooling and does not include the PR2 Tailwind shell baseline. The integration therefore requires selective cherry-pick adaptation rather than direct replay.

This work crosses multiple runtime layers: domain services, world/entity state, update/render systems, asset loading, styling, and mechanics contract tests.

## Goals / Non-Goals

**Goals:**
- Preserve PR3 gameplay outcomes for collectible progression, ghost release behavior, pause feedback, and portal blink feedback.
- Keep the implementation aligned with the current layered architecture and runtime update order.
- Encode behavior in OpenSpec capabilities and mechanics contract scenarios instead of restoring legacy root spec files.
- Keep scope focused on PR3-only mechanics and validation.

**Non-Goals:**
- No migration of PR1/PR2 shell/mobile modernization behavior.
- No screenshot/documentation migration outside OpenSpec artifacts.
- No new gameplay features beyond PR3 behavior parity targets.

## Decisions

1. **Use PR3 commits as canonical behavior reference, not as a literal replay script.**
   - Why: the branch is stacked and current `main` differs materially from PR2 baseline.
   - Alternative considered: merge full branch then trim; rejected due over-scoped risk.

2. **Apply a cherry-pick-and-adapt implementation strategy.**
   - Why: keeps source-of-truth traceability while allowing conflict-safe adaptation per file.
   - Alternative considered: full manual reimplementation; rejected due higher drift risk.

3. **Translate legacy `SPECIFICATIONS.md` intent into OpenSpec capabilities.**
   - Why: repository governance is now OpenSpec-first.
   - Alternative considered: restore legacy root spec flow; rejected as inconsistent with current governance.

4. **Keep pause overlay styling compatible with current CSS approach.**
   - Why: PR3 source styling assumes PR2 Tailwind baseline that is not present on current `main`.
   - Alternative considered: introduce PR2 style stack as dependency; rejected as out-of-scope.

5. **Treat mechanics contract IDs as acceptance surface, not optional docs.**
   - Why: PR3 behavior claims must be reflected in executable contract coverage.
   - Alternative considered: defer ID reconciliation; rejected because it permits behavior/spec drift.

6. **Capture public state/interface deltas explicitly in implementation tasks.**
   - Why: expected deltas span `WorldState`, `PacmanEntity`, constants, jail service options, and system wiring.
   - Alternative considered: infer changes ad hoc during implementation; rejected due regression risk.

## Risks / Trade-offs

- [Risk] Cherry-pick conflicts from stacked ancestry can introduce partial behavior drift.  
  -> Mitigation: transplant by capability slices, then validate with focused unit + mechanics tests.

- [Risk] Visual feedback regressions (pause overlay, portal blink, jail layering) may pass logic tests but fail UX intent.  
  -> Mitigation: keep rendering/system tests explicit for visibility/layering/presentation branches.

- [Risk] Contract/spec mismatch after code transplant.  
  -> Mitigation: update `tests/specs/mechanics.spec.json` and mechanics contract IDs in the same implementation unit.

- [Risk] Over-expansion into PR1/PR2 concerns.  
  -> Mitigation: tasks explicitly fence scope to PR3 subset files and behaviors only.

## Migration Plan

1. Transplant PR3 gameplay slices using cherry-pick-and-adapt flow against current `main`.
2. Implement/adjust domain and system changes for collectibles, release alignment, pause overlay, and blink timing.
3. Add/update targeted unit and mechanics coverage for each behavior slice.
4. Reconcile mechanics scenario IDs and fixture JSON with implemented behavior.
5. Run completion gates: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`.

## Open Questions

- None.
