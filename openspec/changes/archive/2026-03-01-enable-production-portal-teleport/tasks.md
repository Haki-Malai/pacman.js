## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` for production portal enablement scope
- [x] 1.2 Finalize `design.md` with portal-object resolution decisions
- [x] 1.3 Add capability delta for `jail-release-and-pause-feedback`

## 2. Map and Parser

- [x] 2.1 Add `portal-left` and `portal-right` objects to `public/assets/mazes/default/maze.json` Spawns layer
- [x] 2.2 Update `TiledParser` to resolve portal spawn objects to nearest walkable tiles
- [x] 2.3 Mark resolved endpoint collisions with `portal:true` while keeping existing tile property behavior intact

## 3. Tests and Mechanics Contracts

- [x] 3.1 Extend `mazeContract.test.ts` with portal spawn-object assertions
- [x] 3.2 Add parser/runtime contract coverage for default-map portal endpoints `(1,26)` and `(49,26)`
- [x] 3.3 Extend portal mechanics tests with `MEC-PORT-004` default-map teleport scenario
- [x] 3.4 Update mechanics implemented scenario catalog and contract IDs for `MEC-PORT-004`
- [x] 3.5 Promote roadmap map-portal scenario by removing `RD-MAP-001` from roadmap metadata and expectations

## 4. Validation

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
