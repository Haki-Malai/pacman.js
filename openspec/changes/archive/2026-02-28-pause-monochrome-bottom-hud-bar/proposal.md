## Why

Current pause feedback and HUD layout do not match the desired UX contract:
- paused state should be unmistakable with black/white treatment over the whole game surface
- score/lives should live in a dedicated bottom status bar instead of top-left plain text

Defining this as an OpenSpec behavior change keeps the pause/HUD presentation contract explicit and testable.

## Proposed Behavior Delta

- During pause, the full game-root presentation (gameplay canvas and HUD bar) is shown in monochrome with strong dimming.
- Pause overlay remains visible only while paused and hidden after resume.
- HUD is rendered as a persistent, full-width bottom bar with black background at 0.9 opacity.
- Score appears on the left side of the bar.
- Lives appear on the right side of the bar and are represented with heart icons from `/assets/sprites/Heart.png`.

## What Changes

- Update pause presentation classes to apply on game mount instead of canvas-only.
- Rebuild HUD adapter markup/styling for bottom status bar layout.
- Render hearts per-life count in the HUD lives section.
- Add focused tests for pause presentation and HUD rendering behavior.
- Update mechanics spec wording for `MEC-PAUSE-003` to reflect monochrome pause + bottom HUD presentation.

## Impact

- Affected runtime systems:
  - `PauseOverlaySystem`
  - `HudSystem`
  - `HudOverlayAdapter`
  - `GameCompositionRoot` wiring
- Affected tests:
  - add unit tests for pause presentation and HUD adapter behavior
  - update mechanics scenario wording only (no scenario ID churn)

