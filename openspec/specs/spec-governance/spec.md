# spec-governance Specification

## Purpose
TBD - created by archiving change initialize-openspec-spec-workflow. Update Purpose after archive.
## Requirements
### Requirement: Behavior Delta Approval Before Implementation
Any change that alters product behavior or decision logic SHALL present a Proposed Behavior Delta and MUST receive explicit approval before implementation begins.

#### Scenario: Behavior-changing work is gated
- **WHEN** a contributor proposes implementation that changes behavior
- **THEN** the change record includes a Proposed Behavior Delta and explicit approval before code edits proceed

### Requirement: Verification Gate Includes OpenSpec Check
The project SHALL keep a `pnpm run spec:check` verification command, and that command MUST validate OpenSpec artifacts rather than legacy root markdown specs.

#### Scenario: Spec check validates OpenSpec artifacts
- **WHEN** a contributor runs `pnpm run spec:check`
- **THEN** the command executes OpenSpec validation and fails on invalid OpenSpec changes or specs

### Requirement: OpenSpec Is the Authoritative Spec Source
Behavioral and governance requirements SHALL be maintained in `openspec/specs/*` and `openspec/changes/*`, and root-level `SPECIFICATIONS.md` and `ROADMAP.md` MUST NOT be required for workflow correctness.

#### Scenario: Contributor workflow relies on OpenSpec sources
- **WHEN** contributors follow repository guidance for behavior contracts
- **THEN** they are directed to OpenSpec capability specs and change artifacts as the authoritative source

