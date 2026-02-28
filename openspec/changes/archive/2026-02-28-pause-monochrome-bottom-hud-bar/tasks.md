## 1. OpenSpec Artifacts

- [x] 1.1 Create `proposal.md` for pause monochrome + bottom HUD behavior delta
- [x] 1.2 Create `design.md` with implementation decisions and risks
- [x] 1.3 Create `specs/pause-hud-presentation/spec.md` with normative requirements
- [x] 1.4 Create `tasks.md` and execution checklist

## 2. Runtime UI Implementation

- [x] 2.1 Apply paused visual treatment classes to game mount in `PauseOverlaySystem`
- [x] 2.2 Refactor `HudOverlayAdapter` to mount inside game root as bottom bar layout
- [x] 2.3 Render score left, lives right with `/assets/sprites/Heart.png` icons for lives
- [x] 2.4 Update `HudSystem` constructor/signature to pass mount to `HudOverlayAdapter`
- [x] 2.5 Update `GameCompositionRoot` wiring for new `HudSystem` and `PauseOverlaySystem` constructors

## 3. Tests and Mechanics Contract Update

- [x] 3.1 Add `pauseOverlaySystem.test.ts` for mount-level paused classes + overlay aria/visibility behavior
- [x] 3.2 Add `hudOverlayAdapter.test.ts` for bottom bar structure, score/lives updates, and heart icon count
- [x] 3.3 Update `tests/specs/mechanics.spec.json` wording for `MEC-PAUSE-003` expectations

## 4. Verification

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
- [x] 4.5 Run `openspec validate pause-monochrome-bottom-hud-bar --type change --strict --no-interactive`
