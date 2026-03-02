## 1. OpenSpec Artifacts

- [x] 1.1 Finalize `proposal.md` for delayed portal transfer behavior
- [x] 1.2 Finalize `design.md` with threshold, direction, and movement-override decisions
- [x] 1.3 Add delta spec for `jail-release-and-pause-feedback`

## 2. Runtime Implementation

- [x] 2.1 Update `PortalService` with outward-bootstrap predicate and half-tile transfer threshold
- [x] 2.2 Update `PacmanMovementSystem` and `GhostMovementSystem` to use portal outward movement override and tile-size-aware teleport calls
- [x] 2.3 Update portal architecture runtime documentation
- [x] 2.4 Allow Pac-Man buffered turn into outward portal direction at centered endpoint before threshold transfer

## 3. Test and Catalog Updates

- [x] 3.1 Update `portalService.test.ts` and `fuzzInvariants.mechanics.test.ts` for threshold semantics
- [x] 3.2 Update portal mechanics tests and `tests/specs/mechanics.spec.json` scenario wording for delayed transfer
- [x] 3.3 Update movement-system mock coverage tests impacted by portal service API changes
- [x] 3.4 Add regression coverage for perpendicular buffered-turn portal entry

## 4. Validation

- [x] 4.1 Run required gates: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`
