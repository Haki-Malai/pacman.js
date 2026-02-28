import { describe, expect, it, vi } from 'vitest';
import { PACMAN_PORTAL_BLINK } from '../config/constants';
import { openTile } from './fixtures/collisionFixtures';
import { PortalService } from '../game/domain/services/PortalService';
import { MovementRules } from '../game/domain/services/MovementRules';
import { WorldState } from '../game/domain/world/WorldState';
import { PacmanMovementSystem } from '../game/systems/PacmanMovementSystem';

describe('PacmanMovementSystem portal blink', () => {
  it('starts and advances the post-portal blink timer without affecting movement flow', () => {
    const applyBufferedDirectionMock = vi.fn();
    const canMoveMock = vi.fn(() => false);
    const advanceEntityMock = vi.fn();
    const syncEntityPositionMock = vi.fn();
    const tryTeleportMock = vi.fn(() => true);

    const world = {
      pacman: {
        tile: { x: 0, y: 0 },
        moved: { x: 0, y: 0 },
        direction: { current: 'right', next: 'right' },
        angle: 0,
        flipY: false,
        portalBlinkRemainingMs: 0,
        portalBlinkElapsedMs: 0,
      },
      collisionGrid: {
        getTilesAt: vi.fn(() => ({
          current: openTile(),
          up: openTile(),
          down: openTile(),
          left: openTile(),
          right: openTile(),
        })),
      },
      tick: 7,
    } as unknown as WorldState;

    const movementRules = {
      applyBufferedDirection: applyBufferedDirectionMock,
      canMove: canMoveMock,
      advanceEntity: advanceEntityMock,
      syncEntityPosition: syncEntityPositionMock,
    } as unknown as MovementRules;

    const portalService = {
      tryTeleport: tryTeleportMock,
    } as unknown as PortalService;

    const system = new PacmanMovementSystem(world, movementRules, portalService);

    system.update(16);
    expect(world.pacman.portalBlinkRemainingMs).toBe(PACMAN_PORTAL_BLINK.durationMs);
    expect(world.pacman.portalBlinkElapsedMs).toBe(0);
    expect(applyBufferedDirectionMock).toHaveBeenCalledOnce();
    expect(advanceEntityMock).not.toHaveBeenCalled();

    tryTeleportMock.mockReturnValue(false);

    system.update(500);
    expect(world.pacman.portalBlinkRemainingMs).toBe(PACMAN_PORTAL_BLINK.durationMs - 500);
    expect(world.pacman.portalBlinkElapsedMs).toBe(500);

    system.update(PACMAN_PORTAL_BLINK.durationMs);
    expect(world.pacman.portalBlinkRemainingMs).toBe(0);
    expect(world.pacman.portalBlinkElapsedMs).toBe(0);
    expect(syncEntityPositionMock).toHaveBeenCalledTimes(3);
  });
});
