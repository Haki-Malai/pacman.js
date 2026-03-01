## Context

The runtime currently computes ghost/Pac-Man contact in tile space (`same-tile` and `tile-crossing`). That logic is deterministic and easy to test, but it cannot represent actual sprite shape overlap. The game already renders animated sprites with per-frame changes, optional flips, and rotation for Pac-Man orientation, so collision detection can align to rendered pixels without changing collision outcomes.

## Goals / Non-Goals

**Goals:**

- Detect ghost/Pac-Man contact using alpha-mask overlap in world space.
- Keep collision outcome policy unchanged (life loss vs ghost-hit and suppression rules).
- Keep deterministic first-hit behavior by ghost iteration order.
- Reuse shared ghost visual key resolution so rendering and collision use the same sprite source.
- Keep runtime performant by caching rasterized mask frames.

**Non-Goals:**

- No changes to scared mode timing, scoring chain policy, jail-release behavior, or ghost AI.
- No changes to runtime update order.
- No introduction of physics-engine continuous collision or swept-volume collision.

## Decisions

1. **Alpha-mask collision service as the single contact rule**
   - `GhostPacmanCollisionService` will accept sprite mask samples (Pac-Man + ghost candidates) and return first detected collision when opaque pixels overlap.
   - Tile-based `same-tile`/`tile-crossing` checks are removed.
   - Alternative considered: keep tile-crossing fallback; rejected by product decision.

2. **AABB broad-phase + per-pixel narrow-phase**
   - First intersect axis-aligned world-space bounds to skip obvious non-overlaps.
   - For overlap area only, sample world pixels and map to each entity's mask via inverse transform.
   - Alternative considered: per-pixel full-sprite scan; rejected due unnecessary overhead.

3. **Frame-aware, transform-aware masks**
   - Mask sample uses current frame dimensions and entity transform flags (`angle`, `flipX`, `flipY`) to mirror rendered appearance.
   - Pac-Man frame comes from `world.pacmanAnimation.frame`; ghost frame from `world.ghostAnimations` with same sheet-key resolution as rendering.
   - Alternative considered: static masks; rejected because it diverges from visual state and requested behavior.

4. **Cached sprite mask extraction in `AssetCatalog`**
   - Add `getSpriteMask(key, frame, width, height, alphaThreshold)` that rasterizes frame once with nearest-neighbor settings and caches `Uint8Array` opaque mask.
   - Runtime uses threshold `alpha > 0`.
   - Alternative considered: recompute masks every tick; rejected for performance and GC churn.

5. **Remove previous-tile collision state**
   - `pacmanPreviousTile` and `ghostPreviousTiles` are deleted from `WorldState` and movement systems since collision no longer uses tile transitions.
   - Alternative considered: leave dead state for future use; rejected to keep model explicit and minimal.

6. **Shared ghost sheet-key resolver**
   - Extract resolver used by both `RenderSystem` and `GhostPacmanCollisionSystem` so scared/warning key decisions stay consistent.
   - Alternative considered: duplicate logic; rejected due drift risk.

## Risks / Trade-offs

- [Risk] Node test environment has no browser image pipeline for real sprite masks.
  -> Mitigation: collision system accepts injectable mask provider so unit/mechanics tests can supply deterministic masks without DOM image decoding.

- [Risk] Pixel-space checks can be costlier than tile checks.
  -> Mitigation: cache masks and use AABB broad-phase before narrow-phase pixel tests.

- [Risk] Collision feel changes because tile-crossing no longer forces contact.
  -> Mitigation: codify the new behavior in capability specs and mechanics scenarios.

## Migration Plan

1. Add OpenSpec artifacts for proposal/design/spec/tasks under the new change.
2. Implement collision service/type changes and new ghost visual key resolver.
3. Implement cached sprite mask extraction in `AssetCatalog`.
4. Wire runtime collision system to sprite masks in `GameCompositionRoot`.
5. Remove previous-tile collision bookkeeping and obsolete logic.
6. Update tests and mechanics/spec fixtures.
7. Run completion gates: `typecheck`, `lint`, `test`, `spec:check`.

## Open Questions

- None.
