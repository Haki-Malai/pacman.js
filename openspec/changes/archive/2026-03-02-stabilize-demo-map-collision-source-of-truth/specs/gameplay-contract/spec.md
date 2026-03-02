## ADDED Requirements

### Requirement: Demo map traversal respects canonical authored collision metadata
Demo runtime traversal SHALL use collision metadata from the converted `demo.json`, and that metadata MUST originate from canonical `tileset.tsx` collision definitions so blocked interior edges remain deterministic and enforceable.

#### Scenario: Representative interior wall edge remains blocked in demo runtime map
- **WHEN** movement evaluation attempts to cross a known blocked interior edge in the demo map from tile center
- **THEN** movement is rejected at that edge according to canonical collision metadata

#### Scenario: Traversal determinism is stable across repeated loads
- **WHEN** the demo map is parsed in repeated runs without asset changes
- **THEN** interior blocked/open traversal outcomes remain identical across runs
