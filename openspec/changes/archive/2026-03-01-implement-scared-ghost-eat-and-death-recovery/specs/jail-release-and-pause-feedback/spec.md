## ADDED Requirements

### Requirement: Scared ghost recovery visual crossfades to base sprite
When a ghost leaves scared state, the runtime SHALL render a deterministic recovery transition that crossfades from scared sprite to the ghost's base sprite over configured duration.

#### Scenario: Crossfade starts on scared-to-normal transition
- **WHEN** a ghost state changes from scared to non-scared
- **THEN** ghost recovery visual state starts at full scared opacity and zero base opacity

#### Scenario: Crossfade progresses and completes deterministically
- **WHEN** update ticks advance through the configured recovery duration
- **THEN** scared opacity decreases while base opacity increases until recovery visual state is cleared at completion
