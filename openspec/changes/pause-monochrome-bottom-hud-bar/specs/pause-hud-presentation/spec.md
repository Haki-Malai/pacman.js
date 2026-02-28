## ADDED Requirements

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
