## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` for portal-blink collision-shield behavior
- [x] 1.2 Finalize `design.md` with timer reuse and collision-policy decisions
- [x] 1.3 Add spec delta for `ghost-collision-life-loss`
- [x] 1.4 Add spec delta for `jail-release-and-pause-feedback`

## 2. Runtime Implementation

- [x] 2.1 Update `GhostPacmanCollisionSystem` to suppress `pacman-hit` while portal blink shield is active
- [x] 2.2 Preserve existing `ghost-hit` handling during portal blink shield
- [x] 2.3 Keep deterministic first-collision-per-tick behavior unchanged

## 3. Tests and Mechanics Contract

- [x] 3.1 Extend `ghostPacmanCollisionSystem.test.ts` for portal-shield suppression and scared override
- [x] 3.2 Add mechanics scenario `MEC-LIFE-003` in `lifeLoss.mechanics.test.ts`
- [x] 3.3 Update `tests/specs/mechanics.spec.json` with `MEC-LIFE-003`
- [x] 3.4 Update `mechanics.spec.contract.test.ts` expected implemented IDs

## 4. Validation

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
