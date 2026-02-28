# mobile-input-controls Specification

## Purpose
Define normative mobile touch movement controls for Pac-Man runtime input handling.

## Requirements
### Requirement: Touch Swipe Commits Direction
The runtime SHALL convert touch/coarse-pointer swipe gestures into Pac-Man directional intent updates.

#### Scenario: Swipe right updates pending direction
- **GIVEN** the game is running and a primary touch gesture begins on the gameplay surface
- **WHEN** pointer movement exceeds swipe threshold on the positive X axis and passes axis-lock constraints
- **THEN** Pac-Man pending direction is set to `right`

### Requirement: Gesture Filtering Prevents Accidental Direction Changes
The runtime SHALL enforce minimum displacement threshold and dominant-axis lock before committing swipe direction.

#### Scenario: Small movement under threshold is ignored
- **WHEN** touch movement stays below configured swipe threshold
- **THEN** no swipe direction commit occurs

#### Scenario: Ambiguous diagonal movement is ignored until axis dominance is clear
- **WHEN** movement does not satisfy dominant-axis lock ratio
- **THEN** no swipe direction commit occurs

### Requirement: One Commit Per Gesture
The runtime SHALL commit at most one directional update per touch gesture and reset only after gesture end/cancel.

#### Scenario: Additional movement in same gesture does not re-commit
- **GIVEN** a swipe gesture already committed a direction
- **WHEN** further movement occurs before pointer up/cancel
- **THEN** no additional direction commit occurs for that gesture

### Requirement: Keyboard Directional Input Priority
The runtime SHALL prioritize active directional keyboard input over touch swipe commits.

#### Scenario: Swipe is ignored while directional key is held
- **GIVEN** a directional keyboard key is currently pressed
- **WHEN** a touch swipe gesture is performed
- **THEN** swipe commit does not override keyboard-driven direction selection

### Requirement: Pause Interaction Compatibility
The runtime SHALL preserve desktop pointer pause behavior and avoid touch pause conflicts during active gameplay.

#### Scenario: Desktop pointer down toggles pause
- **WHEN** a non-touch pointer down occurs
- **THEN** pause toggle behavior remains available

#### Scenario: Touch pointer down during active play starts swipe without immediate pause
- **GIVEN** gameplay is active and a touch-like pointer down event occurs
- **THEN** swipe tracking starts and pause is not toggled immediately
