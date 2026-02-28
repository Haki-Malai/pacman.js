## ADDED Requirements

### Requirement: Camera starts directly at the intended follow position
At session start, the camera MUST initialize to the clamped follow-centered position of the player target before normal frame-to-frame smoothing is applied.

#### Scenario: Startup does not fly in from top-left
- **WHEN** a new game session initializes camera bounds, zoom, viewport, and follow target
- **THEN** the first rendered gameplay frame uses the target-centered camera position instead of transitioning from `(0, 0)`

### Requirement: Camera follow smoothing remains deterministic
After startup initialization, camera follow movement SHALL continue using configured follow interpolation values.

#### Scenario: Follow updates use configured interpolation
- **WHEN** the follow target moves during gameplay updates
- **THEN** camera position advances according to the configured follow lerp behavior rather than snapping each frame

### Requirement: Camera view remains within world bounds
Camera world coordinates MUST remain clamped to valid map bounds across all updates.

#### Scenario: Follow target approaches map edges
- **WHEN** the follow target is near or beyond a world edge relative to the viewport
- **THEN** camera coordinates are clamped so no out-of-bounds world space is shown

### Requirement: Camera responds correctly to viewport size changes
Camera viewport state SHALL be recomputed from current canvas dimensions whenever the runtime resize handler runs.

#### Scenario: Window resize updates camera viewport
- **WHEN** the window is resized during an active session
- **THEN** renderer and camera viewport dimensions are refreshed and subsequent camera updates honor the new viewport

### Requirement: Camera behavior is protected by automated regression tests
The project MUST maintain deterministic automated tests that cover startup positioning, follow interpolation, bounds clamping, and resize behavior for camera runtime logic.

#### Scenario: Camera regression suite runs in standard test workflow
- **WHEN** the test suite executes in local development or CI
- **THEN** camera behavior regressions are detected by dedicated camera-focused tests

### Requirement: Camera behavior contract is documented for contributors
Developer-facing documentation SHALL describe the current camera startup, follow, bounds, and resize behavior expected by the runtime contract.

#### Scenario: Contributor references camera behavior expectations
- **WHEN** a contributor prepares to change camera runtime logic
- **THEN** they can find clear camera behavior expectations in repository documentation aligned with this capability
