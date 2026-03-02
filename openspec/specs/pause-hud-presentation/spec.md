# pause-hud-presentation Specification

## Purpose
TBD - created by archiving change pause-monochrome-bottom-hud-bar. Update Purpose after archive.
## Requirements
### Requirement: Pause state applies full game-surface old-movie treatment
When runtime is paused, the presentation layer SHALL apply a lighter vintage old-movie treatment to the full game mount surface (gameplay scene and HUD), and SHALL remove the treatment when runtime resumes.

#### Scenario: Pause toggles full-surface old-movie presentation
- **WHEN** runtime transitions from active to paused and back to active
- **THEN** old-movie visual treatment is applied to the game mount only while paused and removed after resume

### Requirement: Pause overlay visibility follows runtime pause state
The pause overlay SHALL be visible only while runtime is paused and SHALL be hidden when runtime resumes.
The overlay SHALL display a prominent uppercase `PAUSED` headline and a visible `Tap or press Space to resume` hint.

#### Scenario: Overlay visibility and aria state match pause state
- **WHEN** runtime toggles pause on and off
- **THEN** overlay visibility class and `aria-hidden` state match the current pause state

### Requirement: HUD is a persistent bottom status bar
HUD SHALL render as a persistent full-width bottom bar over the game mount with black background at 0.9 opacity, showing score on the left and lives on the right.

#### Scenario: Score and lives placement follow bar layout contract
- **WHEN** HUD is initialized
- **THEN** score content is left-aligned, lives content is right-aligned, and the bar is anchored to the bottom of the game mount

### Requirement: Lives are represented by heart icons
Lives display SHALL render one heart icon per current life count using `/assets/sprites/Heart.png`, and SHALL update as lives change.

#### Scenario: Lives updates change heart icon count
- **WHEN** lives change from game-state events
- **THEN** HUD heart icon count matches the latest lives value

### Requirement: Focus loss pauses active gameplay
When gameplay is active, runtime SHALL pause simulation when the browser window loses focus or when document visibility changes to hidden.

#### Scenario: Window blur pauses active runtime
- **WHEN** runtime is active and receives a `window.blur` event
- **THEN** simulation transitions to paused state immediately

#### Scenario: Hidden document pauses active runtime
- **WHEN** runtime is active and `document.visibilityState` becomes hidden
- **THEN** simulation transitions to paused state immediately

### Requirement: Focus return resumes only focus-caused pauses
When focus or visibility returns, runtime SHALL auto-resume only if the current paused state was initiated by focus-loss auto-pause logic.

#### Scenario: Focus return resumes focus-auto-paused runtime
- **WHEN** runtime was auto-paused due to focus loss and receives focus/visible state again
- **THEN** simulation resumes automatically

#### Scenario: Focus return preserves manual pause state
- **WHEN** runtime was manually paused before focus loss and later receives focus/visible state again
- **THEN** runtime remains paused until explicit user resume action

