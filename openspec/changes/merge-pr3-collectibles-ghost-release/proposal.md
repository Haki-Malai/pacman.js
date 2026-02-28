## Why

Current `main` does not yet include the PR3 gameplay mechanics for deterministic collectible progression, event-driven Pac-Man eat feedback, staggered and aligned ghost jail release behavior, and pause/portal visual feedback. The source PR branch is stacked on PR1/PR2 history, so this change is needed to define a safe PR3-only integration contract for the current architecture.

## What Changes

- Define an implementation contract to transplant only PR3 gameplay behavior (`c3a5ff7..b0e5498`) onto current `main` with cherry-pick-and-adapt execution.
- Add deterministic collectible layout and progression behavior (spawn, consume, score, and eat effects) driven by traversable topology.
- Add ghost release cadence/alignment behavior improvements (delay + interval staging, lane alignment, deterministic tie-break controls).
- Add gameplay feedback behavior for pause overlay presentation and post-portal Pac-Man blink visibility timing.
- Reconcile mechanics contract coverage by adding PR3 scenario IDs and aligning `tests/specs/mechanics.spec.json`.
- Keep documentation scope to OpenSpec artifacts and explicitly avoid restoring legacy root `SPECIFICATIONS.md` authority.

## Capabilities

### New Capabilities
- `collectible-progression`: Deterministic collectible placement and consumption rules, including scoring/eat-feedback behavior.
- `jail-release-and-pause-feedback`: Ghost jail release staging/alignment rules and pause/portal visual feedback behavior.

### Modified Capabilities
- None.

## Impact

- Affected gameplay/runtime systems: `GameCompositionRoot`, `WorldState`, `PacmanEntity`, `GhostJailService`, `RenderSystem`, `PacmanMovementSystem`, `GhostReleaseSystem`.
- New units expected during implementation: `PointLayoutService`, `CollectibleSystem`, `PauseOverlaySystem`.
- Affected support surfaces: `constants.ts`, `AssetCatalog`, mechanics tests, and `tests/specs/mechanics.spec.json`.
- No PR1/PR2 shell/mobile migration is included.
