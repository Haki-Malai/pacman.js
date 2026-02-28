## Context

Camera behavior currently lives in two layers: `Camera2D` (`src/engine/camera.ts`) for camera math/state and `CameraSystem` (`src/game/systems/CameraSystem.ts`) for runtime wiring (bounds, zoom, follow target, viewport updates). The current startup path begins with camera coordinates at `(0, 0)` and then follows Pac-Man with lerp, which can produce an unwanted visible fly-in from the top-left at initialization. There are currently no dedicated camera behavior tests, so expected behavior is not locked against regressions.

## Goals / Non-Goals

**Goals:**
- Document the current camera behavior contract in OpenSpec and developer-facing docs.
- Eliminate startup fly-in so the camera begins directly at the intended initial follow position.
- Add detailed automated tests that lock startup, follow, clamp, and resize behavior.
- Preserve existing camera config knobs (`CAMERA.zoom`, `CAMERA.followLerp`) and runtime ordering.

**Non-Goals:**
- Rework camera behavior model (no new cinematic modes, dead zones, or predictive look-ahead).
- Change rendering architecture or update-system ordering.
- Tune camera balance/feel beyond fixing the initialization behavior.

## Decisions

1. **Define a single camera capability contract (`camera-runtime-contract`) in OpenSpec and keep docs aligned with it.**
   - Why: requirements become explicit, testable, and reviewable before implementation.
   - Alternative considered: rely only on tests and inline code comments; rejected because behavioral intent remains fragmented and harder to audit.

2. **Fix startup by introducing an explicit one-time camera snap to follow target after viewport/bounds/follow are configured.**
   - Why: this removes the top-left transition while preserving lerped follow behavior for subsequent updates.
   - Alternative considered: temporarily set lerp to `1` on first frame; rejected because it couples startup behavior to frame timing and can be brittle.
   - Alternative considered: precompute and assign initial `x/y` in composition root; rejected because camera positioning logic should stay inside camera/camera-system responsibilities.

3. **Add regression tests at two levels.**
   - `Camera2D` unit tests for mathematical behavior (desired follow position, clamping to bounds, viewport/zoom interactions, and snap semantics).
   - `CameraSystem` tests for lifecycle behavior (startup initialization sequence, resize handling, and immediate post-start camera placement).
   - Why: unit tests lock math invariants; system tests lock orchestration behavior.
   - Alternative considered: end-to-end visual snapshot testing only; rejected because it is heavier and less deterministic for this logic.

4. **Keep public API stability and deterministic testing.**
   - Any new camera method for startup snap is additive, not a breaking rename/removal.
   - Tests assert deterministic outcomes with explicit world/canvas dimensions and fixed numeric expectations.

## Risks / Trade-offs

- [Risk] Overly strict numeric assertions may be flaky due to floating-point math.
  → Mitigation: use stable fixture values and tolerance-based assertions where appropriate.

- [Risk] Startup snap could accidentally alter non-startup follow behavior.
  → Mitigation: keep snap call scoped to initialization path and add tests confirming regular update lerp remains unchanged.

- [Risk] Documentation and implementation could drift over time.
  → Mitigation: encode behavior as OpenSpec requirements with test-mappable scenarios; keep docs concise and derived from the same contract.

## Migration Plan

1. Add OpenSpec capability spec for camera runtime behavior and required regression coverage.
2. Implement startup snap behavior in camera runtime/system code with minimal surface-area changes.
3. Add/expand detailed camera tests for engine math and system lifecycle.
4. Update camera behavior documentation in repo docs to match OpenSpec contract.
5. Run verification gates (`typecheck`, `lint`, `test`, `spec:check`) before completion.

## Open Questions

- None currently; scope and expected behavior are sufficiently clear for implementation.
