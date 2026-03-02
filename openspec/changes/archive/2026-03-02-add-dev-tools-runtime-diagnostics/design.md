## Context

The runtime already has collision-focused diagnostics controlled by `world.collisionDebugEnabled`, with input handling in `InputSystem` and rendering in `DebugOverlaySystem`. The requested behavior is to evolve this into a combined developer mode that also exposes runtime performance metrics (FPS + frame time) while preserving existing architecture boundaries and public runtime APIs.

## Goals / Non-Goals

**Goals:**
- Toggle diagnostics mode with `Option+KeyC`.
- Keep one shared diagnostics mode flag that controls both collision debug and runtime metrics visibility.
- Show smoothed FPS and frame time in a dedicated runtime panel rendered by `DebugOverlaySystem`.
- Preserve `Shift+KeyC` debug text copy behavior.
- Keep diagnostics mode session-scoped with no persistence.

**Non-Goals:**
- No changes to public runtime API (`start`, `pause`, `resume`, `destroy`).
- No deployment/environment gating logic for diagnostics mode.
- No new persistent settings (localStorage, cookies, URL flags).
- No gameplay behavior changes outside diagnostics controls.

## Decisions

1. Reuse existing `world.collisionDebugEnabled` as the single developer mode flag.
   - Why: this minimizes state expansion and keeps `InputSystem` + `DebugOverlaySystem` coordination simple.
   - Alternative considered: adding a separate `runtimeDiagnosticsEnabled` flag.
   - Rejected because it adds unnecessary mode combinations and extra branching.

2. Use `event.altKey && event.code === 'KeyC'` as the diagnostics toggle.
   - Why: matches the approved key chord (`Option+KeyC`) while preserving platform-neutral keyboard event semantics.
   - Alternative considered: keep plain `C`.
   - Rejected because plain `C` is being intentionally remapped.

3. Keep `Shift+KeyC` clipboard copy behavior intact.
   - Why: existing debug workflow depends on fast panel text export.
   - Alternative considered: move copy to another shortcut.
   - Rejected to avoid unnecessary behavior churn.

4. Compute runtime metrics in `DebugOverlaySystem.render()` with render-timestamp deltas and EMA smoothing.
   - Why: metrics reflect actual render cadence and are naturally updated in the render loop.
   - Alternative considered: compute metrics in `GameRuntime`.
   - Rejected because it would couple runtime loop internals to debug UI concerns.

5. Add a second DOM panel for runtime metrics near the existing collision panel.
   - Why: separates collision inspection text from performance diagnostics and keeps both readable.
   - Alternative considered: merge into one text panel.
   - Rejected because mixed concerns reduce scanability.

## Risks / Trade-offs

- [Risk] First metrics sample can produce unstable FPS values.
  - Mitigation: initialize timing state defensively and show placeholder values until a valid frame delta exists.

- [Risk] Browser throttling/background tabs can lower effective FPS and inflate frame time.
  - Mitigation: this is expected diagnostic behavior; smoothing reduces jitter without hiding timing drift.

- [Risk] Keyboard chord differences across platforms may confuse users.
  - Mitigation: document controls as `Option+KeyC` and rely on `altKey` for cross-browser handling.

## Migration Plan

1. Create OpenSpec artifacts (proposal, design, spec delta, tasks).
2. Implement input mapping and debug overlay/runtime panel updates.
3. Add/adjust unit tests for controls and diagnostics rendering.
4. Run required gates: `typecheck`, `lint`, `test`, `spec:check`, and strict OpenSpec validation.
5. No compatibility shim or data migration required.

## Open Questions

- None. Input chord, combined mode behavior, metric set, and persistence scope are all explicitly decided.
