## Context

Portal endpoints in the parsed maps are intentionally boundary-adjacent and protected by collision/void guards. Current runtime behavior allows transfers too early for intended feel, and current docs/spec language no longer reflects desired gameplay timing. This change must stay deterministic, minimal, and local to portal + movement systems without parser collision rewrites.

## Goals / Non-Goals

**Goals:**
- Delay teleport until outward progress reaches a deterministic half-tile threshold.
- Require explicit outward direction match before teleporting.
- Allow outward progression from centered portal endpoints without map-void leaks.
- Allow Pac-Man buffered turns into valid outward portal traversal from perpendicular approach at centered endpoints.
- Keep same-tick bounce guard and destination full-block guard unchanged.
- Apply behavior uniformly to Pac-Man and ghosts.

**Non-Goals:**
- No map parser portal-pair inference changes.
- No collision metadata rewrites in Tiled conversion/parsing.
- No changes to blink duration, collision shield timing, or ghost-collision outcome rules.

## Decisions

1. **Half-tile threshold transfer**
   - Decision: teleport when outward offset along active direction reaches `>= tileSize / 2`.
   - Why: removes immediate trigger while remaining deterministic and responsive.
   - Alternative: edge-only transfer (`tileSize - 1`) rejected as overly delayed.

2. **Direction is mandatory for teleport**
   - Decision: remove legacy centered fallback when direction is missing.
   - Why: avoids ambiguous transfer and ensures outward intent is explicit.
   - Alternative: fallback-to-center behavior rejected to prevent early/implicit transfers.

3. **Portal-edge movement override in systems**
   - Decision: add a portal service predicate used by movement systems to allow initial outward step from centered portal endpoints even when normal collision blocks that edge.
   - Why: preserves parser/collision invariants while enabling delayed transfer timing.
   - Alternative: parser collision rewrite rejected by approved scope.

4. **Destination guard remains full-block only**
   - Decision: preserve existing destination `isFullyBlocking` check exactly.
   - Why: approved behavior keeps this policy unchanged.

5. **Same-tick bounce guard remains unchanged**
   - Decision: keep per-entity `lastTeleportTick` behavior intact.
   - Why: required deterministic anti-bounce contract.

6. **Pac-Man turn buffering gets a portal-specific centered override**
   - Decision: when Pac-Man is centered on a portal endpoint and `direction.next` is outward-valid, allow turning into that direction even if normal `canMove(next)` is blocked.
   - Why: preserves responsive controls at portal endpoints while keeping collision hardening and delayed-transfer semantics.
   - Alternative: leave buffered turn blocked and require straight approach; rejected by approved behavior delta.

## Risks / Trade-offs

- [Risk] Allowing outward movement without transfer could leak entities outside map bounds.
  - Mitigation: allow portal-edge movement only when destination is teleport-eligible (not fully blocking), and teleport at half-tile threshold before boundary crossing.

- [Risk] Ghost pathing at portal endpoints could diverge if portal override competes with ghost decision logic.
  - Mitigation: apply override only for blocked-at-center outward bootstrap; keep normal decision branch unchanged otherwise.

- [Risk] Portal turn override could accidentally permit non-portal blocked turns.
  - Mitigation: gate override by portal endpoint + outward-direction validity through `PortalService`; leave all non-portal turns on normal `canMove`.

- [Risk] Behavior/docs drift across mechanics catalogs and OpenSpec.
  - Mitigation: update mechanics scenario text and OpenSpec delta in same change; validate with `spec:check`.
