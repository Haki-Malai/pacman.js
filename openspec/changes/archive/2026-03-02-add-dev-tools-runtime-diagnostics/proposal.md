## Why

Current development diagnostics focus on collision inspection but do not expose live runtime performance. Adding an FPS/frame-time panel alongside collision diagnostics improves debugging speed when validating movement, pause behavior, and render timing.

## Proposed Behavior Delta

- `Option+KeyC` toggles a combined developer diagnostics mode on and off.
- While diagnostics mode is enabled, collision debug overlay/panel and runtime performance panel are both visible.
- Runtime performance panel shows smoothed FPS and current frame time in milliseconds.
- Plain `C` no longer toggles collision debug.
- Diagnostics mode resets to disabled on each page load (no persistence).

## What Changes

- Add a combined diagnostics toggle in `InputSystem` using `event.altKey && event.code === 'KeyC'`.
- Keep existing `Shift+KeyC` clipboard copy behavior for debug panel text.
- Extend `DebugOverlaySystem` with a second panel for runtime metrics (FPS + frame time).
- Keep collision debug and runtime metrics visibility bound to the same world debug flag.
- Add/extend tests for input mapping changes and debug overlay runtime metrics panel behavior.
- Update repository docs with diagnostics controls.

## Capabilities

### New Capabilities

- `developer-runtime-diagnostics`: Defines keyboard activation, visibility behavior, displayed diagnostics metrics, and session-scoped diagnostics state.

### Modified Capabilities

- None.

## Impact

- Runtime input handling:
  - `src/game/systems/InputSystem.ts`
- Runtime diagnostics presentation:
  - `src/game/systems/DebugOverlaySystem.ts`
- Unit tests:
  - `src/__tests__/inputSystem.test.ts`
  - `src/__tests__/debugOverlaySystem.test.ts` (new)
- Documentation:
  - `README.md`
- OpenSpec artifacts:
  - `openspec/changes/add-dev-tools-runtime-diagnostics/*`
