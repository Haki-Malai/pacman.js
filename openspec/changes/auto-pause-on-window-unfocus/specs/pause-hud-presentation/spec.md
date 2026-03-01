## ADDED Requirements

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
