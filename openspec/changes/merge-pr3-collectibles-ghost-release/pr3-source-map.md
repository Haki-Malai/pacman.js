# PR3 Source Map (c3a5ff7..b0e5498)

This map captures PR3-only file decisions for applying onto current `main`.

## Keep (apply from PR3 with minimal/no adaptation)

- `src/config/constants.ts`
- `src/game/app/GameCompositionRoot.ts`
- `src/game/domain/entities/PacmanEntity.ts`
- `src/game/domain/services/GhostJailService.ts`
- `src/game/domain/services/PointLayoutService.ts` (new)
- `src/game/domain/world/WorldState.ts`
- `src/game/infrastructure/assets/AssetCatalog.ts`
- `src/game/systems/AnimationSystem.ts`
- `src/game/systems/CollectibleSystem.ts` (new)
- `src/game/systems/GhostReleaseSystem.ts`
- `src/game/systems/PacmanMovementSystem.ts`
- `src/game/systems/PauseOverlaySystem.ts` (new)
- `src/game/systems/RenderSystem.ts`
- `src/__tests__/mechanics.spec.contract.test.ts`
- `src/__tests__/mechanics/animationState.mechanics.test.ts`
- `src/__tests__/mechanics/ghostServicesCoverage.mechanics.test.ts`
- `src/__tests__/mechanics/systemsCoverage.mechanics.test.ts`
- `src/__tests__/pacmanMovementSystem.test.ts` (new)
- `src/__tests__/pointLayoutService.test.ts` (new)
- `src/__tests__/renderSystem.test.ts` (new)
- `tests/specs/mechanics.spec.json`

## Adapt (apply PR3 intent with current-main constraints)

- `src/style.css`
  - Keep current-main plain CSS baseline.
  - Add only pause-overlay / paused-canvas classes needed by PR3 behavior.
  - Do not import PR2 Tailwind stack or shell styling model.

## Skip (out of scope for PR3-only subset on current main)

- `SPECIFICATIONS.md` (legacy root spec edits are not authority; OpenSpec is source of truth)
- `docs/screenshots/pr3-gameplay-collectibles-ghost.png`
