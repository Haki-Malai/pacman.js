## ADDED Requirements

### Requirement: Developer diagnostics mode toggles via Option+KeyC
The runtime SHALL toggle developer diagnostics mode only when the keyboard event includes `altKey` and `code === 'KeyC'`.

#### Scenario: Option+KeyC enables diagnostics mode
- **WHEN** diagnostics mode is disabled and the user presses `Option+KeyC`
- **THEN** diagnostics mode becomes enabled

#### Scenario: Option+KeyC disables diagnostics mode
- **WHEN** diagnostics mode is enabled and the user presses `Option+KeyC`
- **THEN** diagnostics mode becomes disabled

### Requirement: Combined diagnostics mode controls collision and runtime panels together
When developer diagnostics mode is enabled, the runtime SHALL display both collision debug visuals and runtime diagnostics panel output; when disabled, both SHALL be hidden.

#### Scenario: Enabled mode shows both diagnostics surfaces
- **WHEN** diagnostics mode transitions from disabled to enabled
- **THEN** collision debug rendering and runtime diagnostics panel are both visible

#### Scenario: Disabled mode hides both diagnostics surfaces
- **WHEN** diagnostics mode transitions from enabled to disabled
- **THEN** collision debug rendering and runtime diagnostics panel are both hidden

### Requirement: Runtime diagnostics panel exposes FPS and frame time
The runtime diagnostics panel SHALL display smoothed frames-per-second (FPS) and current frame time in milliseconds.

#### Scenario: Runtime panel displays performance metrics
- **WHEN** diagnostics mode is enabled and rendering advances across frames
- **THEN** the runtime diagnostics panel includes FPS and frame-time values

### Requirement: Plain C no longer toggles collision diagnostics
The runtime SHALL NOT toggle developer diagnostics mode for plain `KeyC` keyboard events without the `altKey` modifier.

#### Scenario: Plain C leaves diagnostics mode unchanged
- **WHEN** the user presses `KeyC` without `altKey`
- **THEN** diagnostics mode state remains unchanged

### Requirement: Diagnostics mode is session-scoped
Developer diagnostics mode SHALL start disabled on each runtime initialization and SHALL not persist between page reloads.

#### Scenario: Reload resets diagnostics mode
- **WHEN** a new runtime session starts after a page reload
- **THEN** diagnostics mode is disabled by default
