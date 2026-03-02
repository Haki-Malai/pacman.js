## Context

The runtime already exposes explicit pause/resume controls and pause presentation systems driven by `world.isMoving`. Input blur handling currently clears held keys but does not pause simulation. The requested behavior is to stop active gameplay on unfocus while preserving manual pause intent across focus transitions.

## Goals / Non-Goals

**Goals:**
- Pause active gameplay when the window loses focus or the document becomes hidden.
- Auto-resume on focus return only when pause was initiated by focus loss.
- Preserve existing manual pause semantics and existing pause overlay/HUD presentation behavior.
- Keep changes localized to runtime lifecycle and unit tests.

**Non-Goals:**
- No changes to public runtime API (`PacmanGame`, `RuntimeControl`).
- No changes to visual pause presentation contract.
- No new configuration flags for focus behavior in this change.

## Decisions

1. Register focus listeners directly inside `GameRuntime`.
   - Rationale: pause state ownership already lives in runtime control (`pause`, `resume`, `togglePause`), so the behavior belongs in the same layer.
   - Alternative considered: handling focus in `InputSystem`.
   - Rejected because `InputSystem` should translate user intent, not own runtime lifecycle concerns.

2. Track auto-paused state with an internal runtime flag.
   - Rationale: enables conditional auto-resume without changing public contracts.
   - Alternative considered: infer from `world.isMoving`.
   - Rejected because it cannot distinguish manual pause from focus-triggered pause.

3. Handle both `window.blur` and `document.visibilitychange`.
   - Rationale: covers tab switching, app switching, and browser-level focus transitions across platforms.
   - Alternative considered: `blur` only.
   - Rejected due to incomplete coverage in hidden-tab flows.

## Risks / Trade-offs

- [Risk] Duplicate pause calls from `blur` and `visibilitychange` in the same transition.
  - Mitigation: guard on current runtime state and idempotent pause semantics.
- [Risk] Focus/visibility events firing before runtime is fully composed.
  - Mitigation: centralize guards checking `started`, `destroyed`, and `composed` availability.
- [Risk] Listener leaks if runtime is destroyed/restarted.
  - Mitigation: bind listeners in `start()`, unbind in `destroy()`, and reset focus flags during teardown.

## Migration Plan

1. Add OpenSpec proposal, design, spec delta, and tasks.
2. Implement runtime focus pause/resume logic and tests.
3. Run verification gates (`typecheck`, `lint`, `test`, `spec:check`, `openspec validate`).
4. No data migration or compatibility bridge is required.

## Open Questions

- None for this change; resume mode and trigger sources are already decided.
