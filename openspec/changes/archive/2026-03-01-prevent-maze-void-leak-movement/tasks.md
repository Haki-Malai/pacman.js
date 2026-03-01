## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` for maze leak prevention scope
- [x] 1.2 Finalize `design.md` with boundary/void decisions
- [x] 1.3 Add capability deltas for `gameplay-contract` and `jail-release-and-pause-feedback`

## 2. Runtime Implementation

- [x] 2.1 Update `CollisionGrid.getTileAt` so out-of-bounds returns a blocking boundary tile
- [x] 2.2 Update `TiledParser` so `gid <= 0` cells are parsed as blocking void tiles
- [x] 2.3 Keep portal movement/service behavior unchanged while no-leak behavior is enforced

## 3. Tests and Mechanics Contracts

- [x] 3.1 Extend `movement.test.ts` with out-of-bounds neighbor blocking coverage
- [x] 3.2 Extend `mazeContract.test.ts` with parsed default-map void boundary blocking assertions
- [x] 3.3 Add `MEC-PORT-005` no-leak portal endpoint scenario in `portal.mechanics.test.ts`
- [x] 3.4 Update mechanics implemented scenario catalog and expected IDs for `MEC-PORT-005`

## 4. Validation

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
