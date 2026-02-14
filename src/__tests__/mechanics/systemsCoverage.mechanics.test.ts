import { describe, expect, it, vi } from 'vitest';
import { GHOST_JAIL_RELEASE_DELAY_MS, GHOST_JAIL_RELEASE_TWEEN_MS } from '../../config/constants';
import { GhostEntity } from '../../game/domain/entities/GhostEntity';
import { GhostJailService } from '../../game/domain/services/GhostJailService';
import { MovementRules } from '../../game/domain/services/MovementRules';
import { PortalService } from '../../game/domain/services/PortalService';
import { WorldState } from '../../game/domain/world/WorldState';
import { TimerSchedulerAdapter } from '../../game/infrastructure/adapters/TimerSchedulerAdapter';
import { AnimationSystem } from '../../game/systems/AnimationSystem';
import { GhostReleaseSystem } from '../../game/systems/GhostReleaseSystem';
import { PacmanMovementSystem } from '../../game/systems/PacmanMovementSystem';
import { SeededRandom } from '../../game/shared/random/SeededRandom';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';
import { openTile } from '../fixtures/collisionFixtures';
import { AnimationKey } from '../../game/domain/world/WorldState';

describe('pacman movement system coverage', () => {
  it('covers direction visuals and movement gate branches', () => {
    const applyBufferedDirectionMock = vi.fn();
    const canMoveMock = vi.fn(() => true);
    const advanceEntityMock = vi.fn();
    const syncEntityPositionMock = vi.fn();
    const tryTeleportMock = vi.fn();

    const world = {
      pacman: {
        tile: { x: 0, y: 0 },
        moved: { x: 0, y: 0 },
        direction: { current: 'right', next: 'right' },
        angle: 0,
        flipY: false,
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
      tick: 3,
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

    world.pacman.direction.current = 'right';
    system.update();
    expect(world.pacman.angle).toBe(0);
    expect(world.pacman.flipY).toBe(false);

    world.pacman.direction.current = 'left';
    system.update();
    expect(world.pacman.angle).toBe(180);
    expect(world.pacman.flipY).toBe(true);

    world.pacman.direction.current = 'up';
    system.update();
    expect(world.pacman.angle).toBe(-90);

    world.pacman.direction.current = 'down';
    canMoveMock.mockReturnValueOnce(false);
    system.update();
    expect(world.pacman.angle).toBe(90);

    expect(applyBufferedDirectionMock).toHaveBeenCalled();
    expect(advanceEntityMock).toHaveBeenCalledTimes(3);
    expect(tryTeleportMock).toHaveBeenCalled();
    expect(syncEntityPositionMock).toHaveBeenCalled();
  });
});

describe('ghost release system coverage', () => {
  it('covers update filtering for free and exiting ghosts', () => {
    const harness = new MechanicsDomainHarness({ seed: 707, fixture: 'default-map', ghostCount: 2, autoStartSystems: false });

    try {
      const moveGhostInJail = vi.spyOn(harness.jailService, 'moveGhostInJail');
      const [first, second] = harness.world.ghosts;
      if (!first || !second) {
        throw new Error('expected two ghosts for filter coverage test');
      }

      second.state.free = true;
      harness.world.ghostsExitingJail.add(first);
      harness.ghostReleaseSystem.update();
      expect(moveGhostInJail).not.toHaveBeenCalled();

      harness.world.ghostsExitingJail.clear();
      harness.ghostReleaseSystem.update();
      expect(moveGhostInJail).toHaveBeenCalledTimes(1);
    } finally {
      harness.destroy();
    }
  });

  it('covers inactive branches before release and during tween completion', () => {
    const harness = new MechanicsDomainHarness({ seed: 808, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost');
      }

      ghost.active = false;
      harness.ghostReleaseSystem.start();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
      expect(harness.world.ghostsExitingJail.size).toBe(0);
      expect(ghost.state.free).toBe(false);

      harness.ghostReleaseSystem.destroy();

      ghost.active = true;
      harness.ghostReleaseSystem.start();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS - 1);
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(false);
      harness.scheduler.update(1);
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(true);

      ghost.active = false;
      harness.scheduler.update(GHOST_JAIL_RELEASE_TWEEN_MS);
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(false);
      expect(ghost.state.free).toBe(false);
    } finally {
      harness.destroy();
    }
  });

  it('covers GhostReleaseSystem with explicit mocked dependencies', () => {
    const ghost = new GhostEntity({
      key: 'inky',
      tile: { x: 1, y: 1 },
      direction: 'left',
      speed: 1,
      displayWidth: 10,
      displayHeight: 10,
    });

    const world = {
      ghosts: [ghost],
      ghostsExitingJail: new Set<GhostEntity>(),
      ghostJailBounds: { minX: 0, maxX: 2, y: 1 },
      pacman: { tile: { x: 0, y: 0 } },
      map: {
        width: 3,
        height: 3,
      },
      collisionGrid: {
        getTilesAt: vi.fn(),
      },
      tileSize: 16,
    } as unknown as WorldState;

    const setEntityTileMock = vi.fn();
    const movementRules = {
      setEntityTile: setEntityTileMock,
    } as unknown as MovementRules;

    const findReleaseTileMock = vi.fn(() => ({ x: 1, y: 0 }));
    const jailService = {
      moveGhostInJail: vi.fn(),
      findReleaseTile: findReleaseTileMock,
    } as unknown as GhostJailService;

    const scheduler = new TimerSchedulerAdapter();
    const system = new GhostReleaseSystem(world, movementRules, jailService, scheduler, new SeededRandom(11));

    system.start();
    scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
    scheduler.update(GHOST_JAIL_RELEASE_TWEEN_MS);

    expect(findReleaseTileMock).toHaveBeenCalled();
    expect(setEntityTileMock).toHaveBeenCalled();
    system.destroy();
  });
});

describe('animation system coverage', () => {
  it('covers playback creation, missing playback guard, and yoyo direction branches', () => {
    const harness = new MechanicsDomainHarness({ seed: 909, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for animation test');
      }

      harness.animationSystem.start();
      expect(harness.world.ghostAnimations.has(ghost)).toBe(true);

      harness.world.ghostAnimations.delete(ghost);
      harness.animationSystem.update(100);
      expect(harness.world.ghostAnimations.has(ghost)).toBe(false);

      harness.world.ghostAnimations.set(ghost, {
        key: `${ghost.key}Idle`,
        frame: 0,
        elapsedMs: 0,
        forward: 1,
      });

      ghost.state.scared = true;
      harness.animationSystem.update(250);
      expect(ghost.state.animation).toBe('scared');

      ghost.state.scared = false;
      harness.animationSystem.update(250);
      expect(ghost.state.animation).toBe('default');

      const playback = harness.world.ghostAnimations.get(ghost);
      expect(playback).toBeDefined();
      if (!playback) {
        return;
      }

      playback.frame = 7;
      playback.forward = 1;
      playback.elapsedMs = 250;
      harness.animationSystem.update(250);
      expect(playback.forward).toBe(-1);

      playback.frame = 2;
      playback.forward = -1;
      playback.elapsedMs = 250;
      harness.animationSystem.update(250);
      expect(playback.frame).toBeLessThan(2);

      playback.frame = 0;
      playback.forward = -1;
      playback.elapsedMs = 250;
      harness.animationSystem.update(250);
      expect(playback.forward).toBe(1);

      const nonYoyoAnimations: Record<AnimationKey, { start: number; end: number; yoyo: boolean; frameRate: number }> = {
        scaredIdle: { start: 0, end: 2, yoyo: false, frameRate: 4 },
        inkyIdle: { start: 0, end: 2, yoyo: false, frameRate: 4 },
        clydeIdle: { start: 0, end: 2, yoyo: false, frameRate: 4 },
        pinkyIdle: { start: 0, end: 2, yoyo: false, frameRate: 4 },
        blinkyIdle: { start: 0, end: 2, yoyo: false, frameRate: 4 },
      };

      const nonYoyoSystem = new AnimationSystem(harness.world, 1, nonYoyoAnimations);
      ghost.state.scared = true;
      ghost.state.animation = 'scared';
      harness.world.ghostAnimations.set(ghost, {
        key: 'scaredIdle',
        frame: 0,
        elapsedMs: 0,
        forward: 1,
      });

      nonYoyoSystem.update(250);
      const nonYoyoPlayback = harness.world.ghostAnimations.get(ghost);
      expect(nonYoyoPlayback?.frame).toBe(1);

      nonYoyoSystem.update(1000);
      expect((harness.world.ghostAnimations.get(ghost)?.frame ?? -1) >= 0).toBe(true);
    } finally {
      harness.destroy();
    }
  });
});
