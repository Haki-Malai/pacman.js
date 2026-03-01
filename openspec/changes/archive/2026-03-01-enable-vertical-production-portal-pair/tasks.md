## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` for dual production portal pair behavior
- [x] 1.2 Finalize `design.md` with deterministic multi-pair parser/service decisions
- [x] 1.3 Add capability delta for `jail-release-and-pause-feedback`

## 2. Map and Runtime Wiring

- [x] 2.1 Add `portal-top` and `portal-bottom` objects to `public/assets/mazes/default/maze.json`
- [x] 2.2 Add `pairId` metadata to all portal spawn objects (`horizontal` / `vertical`)
- [x] 2.3 Extend `TiledParser` to emit deterministic explicit `portalPairs` metadata
- [x] 2.4 Update `PortalService` to use explicit pairs when provided and preserve fallback behavior
- [x] 2.5 Wire map-provided `portalPairs` through runtime composition and mechanics harness

## 3. Tests and Mechanics Contracts

- [x] 3.1 Extend `mazeContract.test.ts` for four portal objects + `pairId` metadata
- [x] 3.2 Assert parsed default-map portal endpoints `(1,26)`, `(49,26)`, `(25,1)`, `(25,49)` and deterministic `portalPairs`
- [x] 3.3 Add portal service coverage for explicit multi-pair mapping
- [x] 3.4 Update `MEC-PORT-004` and add `MEC-PORT-006` vertical endpoint transfer scenario
- [x] 3.5 Update mechanics scenario catalog and mechanics contract expected IDs for `MEC-PORT-006`

## 4. Validation

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
