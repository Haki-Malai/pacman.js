## Why

Gameplay currently continues running when the browser window loses focus or the tab becomes hidden. This can cause unintended game progression while the player is away from the game surface.

## Proposed Behavior Delta

- When gameplay is active and focus is lost (`window.blur`) or the tab is hidden (`document.visibilitychange`), the runtime pauses immediately.
- When focus returns, gameplay auto-resumes only if that paused state was caused by focus loss.
- If the player had manually paused before losing focus, the runtime remains paused after focus returns.
- Existing pause presentation behavior remains unchanged and continues to track runtime pause state.

## What Changes

- Add runtime-level focus listeners in `GameRuntime` for `blur`, `focus`, and `visibilitychange`.
- Track whether the current paused state was initiated by focus loss.
- Ensure listener lifecycle is tied to runtime `start()` and `destroy()`.
- Extend `gameRuntime` unit tests to cover focus-driven pause/resume semantics.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pause-hud-presentation`: add normative runtime behavior for focus-loss auto-pause and focus-return conditional auto-resume.

## Impact

- Runtime lifecycle and pause control:
  - `src/game/app/GameRuntime.ts`
- Runtime unit coverage:
  - `src/__tests__/gameRuntime.test.ts`
- OpenSpec artifacts for this change:
  - `openspec/changes/auto-pause-on-window-unfocus/*`
