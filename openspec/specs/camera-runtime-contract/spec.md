# camera-runtime-contract Specification

## Purpose
TBD - created by archiving change stabilize-camera-initialization-and-lock-behavior. Update Purpose after archive.
## Requirements
### Requirement: Camera starts directly at the intended follow position
At session start, the camera MUST initialize to the follow-centered player target position constrained by the viewport/bounds policy before normal frame-to-frame smoothing is applied.

#### Scenario: Startup does not fly in from top-left
- **WHEN** a new game session initializes camera bounds, zoom, viewport, and follow target
- **THEN** the first rendered gameplay frame uses the target-centered camera position instead of transitioning from `(0, 0)`

### Requirement: Camera follow smoothing remains deterministic
After startup initialization, camera follow movement SHALL continue using configured follow interpolation values.

#### Scenario: Follow updates use configured interpolation
- **WHEN** the follow target moves during gameplay updates
- **THEN** camera position advances according to the configured follow lerp behavior rather than snapping each frame

### Requirement: Camera view honors bounds policy per axis
Camera coordinates MUST follow the runtime bounds policy on each axis across all updates:
- clamp to map bounds when the map is larger than the viewport on that axis
- hold a centered offset when the viewport is larger than the map on that axis

#### Scenario: Follow target approaches map edges
- **WHEN** the follow target is near or beyond a world edge relative to the viewport
- **THEN** camera coordinates clamp to map bounds on larger-map axes and remain centered on undersized-map axes

#### Scenario: Viewport is larger than the map
- **WHEN** a map axis is smaller than the current viewport axis
- **THEN** that axis stays centered so the map remains visually centered in the canvas

### Requirement: Camera responds correctly to viewport size changes
Camera viewport state SHALL be recomputed from current canvas dimensions whenever the runtime resize handler runs.

#### Scenario: Window resize updates camera viewport
- **WHEN** the window is resized during an active session
- **THEN** renderer and camera viewport dimensions are refreshed and subsequent camera updates honor the new viewport

### Requirement: Camera and renderer use logical viewport dimensions on high-DPI displays
Renderer backing resolution MAY scale with device pixel ratio, but camera viewport and bounds calculations SHALL use logical viewport dimensions so resize, follow, clamp, and center behavior remain consistent across standard and high-DPI displays.

#### Scenario: High-DPI resize preserves camera framing
- **WHEN** the runtime canvas is resized on a high-DPI display
- **THEN** the backing canvas resolution may increase for sharp rendering, while camera viewport dimensions continue to match the logical screen size used for gameplay framing

#### Scenario: Camera transform accounts for backing pixel ratio
- **WHEN** world rendering begins after a high-DPI resize
- **THEN** camera zoom and translation are applied at the backing pixel scale without changing gameplay-space camera coordinates

### Requirement: Map presentation remains pixel-aligned and crisp
Map rendering SHALL preserve pixel-art clarity by disabling smoothing and snapping rendered map layers to backing pixels during world presentation.

#### Scenario: Map layer renders without subpixel blur
- **WHEN** the map is drawn through the camera on any supported device pixel ratio
- **THEN** tile imagery is presented with pixelated/crisp rendering and without subpixel seams from fractional backing-pixel placement

### Requirement: Camera behavior is protected by automated regression tests
The project MUST maintain deterministic automated tests that cover startup positioning, follow interpolation, bounds policy (clamp-or-center), and resize behavior for camera runtime logic.

#### Scenario: Camera regression suite runs in standard test workflow
- **WHEN** the test suite executes in local development or CI
- **THEN** camera behavior regressions are detected by dedicated camera-focused tests

### Requirement: Camera behavior contract is documented for contributors
Developer-facing documentation SHALL describe the current camera startup, follow, bounds, and resize behavior expected by the runtime contract.

#### Scenario: Contributor references camera behavior expectations
- **WHEN** a contributor prepares to change camera runtime logic
- **THEN** they can find clear camera behavior expectations in repository documentation aligned with this capability
