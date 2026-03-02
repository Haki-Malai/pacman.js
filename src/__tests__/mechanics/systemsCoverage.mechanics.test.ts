import { describe, expect, it, vi } from 'vitest';
import {
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_INTERVAL_MS,
} from '../../config/constants';
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
    const canAdvanceOutwardMock = vi.fn(() => false);

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
      tileSize: 16,
      tick: 3,
    } as unknown as WorldState;

    const movementRules = {
      applyBufferedDirection: applyBufferedDirectionMock,
      canMove: canMoveMock,
      advanceEntity: advanceEntityMock,
      syncEntityPosition: syncEntityPositionMock,
    } as unknown as MovementRules;

    const portalService = {
      canAdvanceOutward: canAdvanceOutwardMock,
      tryTeleport: tryTeleportMock,
    } as unknown as PortalService;

    const system = new PacmanMovementSystem(world, movementRules, portalService);

    world.pacman.direction.current = 'right';
    world.pacman.direction.next = 'right';
    system.update();
    expect(world.pacman.angle).toBe(0);
    expect(world.pacman.flipY).toBe(false);

    world.pacman.direction.current = 'left';
    world.pacman.direction.next = 'left';
    system.update();
    expect(world.pacman.angle).toBe(180);
    expect(world.pacman.flipY).toBe(true);

    world.pacman.direction.current = 'up';
    world.pacman.direction.next = 'up';
    system.update();
    expect(world.pacman.angle).toBe(-90);

    world.pacman.direction.current = 'down';
    world.pacman.direction.next = 'down';
    canMoveMock.mockReturnValueOnce(false);
    system.update();
    expect(world.pacman.angle).toBe(90);

    expect(applyBufferedDirectionMock).toHaveBeenCalled();
    expect(advanceEntityMock).toHaveBeenCalledTimes(3);
    expect(tryTeleportMock).toHaveBeenCalled();
    expect(syncEntityPositionMock).toHaveBeenCalled();
  });

  it('covers portal blink reset, finite-delta guards, and teleport-triggered blink bootstrap', () => {
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
      tileSize: 16,
      tick: 22,
    } as unknown as WorldState;

    const movementRules = {
      applyBufferedDirection: vi.fn(),
      canMove: vi.fn(() => false),
      advanceEntity: vi.fn(),
      syncEntityPosition: vi.fn(),
    } as unknown as MovementRules;

    const tryTeleportMock = vi.fn(() => true);
    const portalService = {
      canAdvanceOutward: vi.fn(() => false),
      tryTeleport: tryTeleportMock,
    } as unknown as PortalService;

    const system = new PacmanMovementSystem(world, movementRules, portalService);

    world.pacman.portalBlinkRemainingMs = 50;
    world.pacman.portalBlinkElapsedMs = 10;
    system.update(Number.NaN);

    expect(world.pacman.portalBlinkRemainingMs).toBeGreaterThan(0);
    expect(world.pacman.portalBlinkElapsedMs).toBe(0);

    tryTeleportMock.mockReturnValue(false);
    world.pacman.portalBlinkRemainingMs = 30;
    world.pacman.portalBlinkElapsedMs = 5;
    system.update(-15);
    expect(world.pacman.portalBlinkRemainingMs).toBe(30);
    expect(world.pacman.portalBlinkElapsedMs).toBe(5);

    system.update(45);
    expect(world.pacman.portalBlinkRemainingMs).toBe(0);
    expect(world.pacman.portalBlinkElapsedMs).toBe(0);
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

  it('covers inactive branches before release and during release cleanup', () => {
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
      harness.ghostReleaseSystem.update();
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(false);
      expect(ghost.state.free).toBe(false);
    } finally {
      harness.destroy();
    }
  });

  it('stages ghost releases using delay plus per-ghost interval timing', () => {
    const harness = new MechanicsDomainHarness({ seed: 1818, fixture: 'default-map', ghostCount: 3, autoStartSystems: false });

    try {
      const releaseGhostSpy = vi.spyOn(
        harness.ghostReleaseSystem as unknown as { releaseGhost: (ghost: GhostEntity, ghostIndex: number) => void },
        'releaseGhost',
      );

      harness.ghostReleaseSystem.start();

      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS - 1);
      expect(releaseGhostSpy).not.toHaveBeenCalled();

      harness.scheduler.update(1);
      expect(releaseGhostSpy).toHaveBeenCalledTimes(1);

      harness.scheduler.update(GHOST_JAIL_RELEASE_INTERVAL_MS - 1);
      expect(releaseGhostSpy).toHaveBeenCalledTimes(1);

      harness.scheduler.update(1);
      expect(releaseGhostSpy).toHaveBeenCalledTimes(2);

      harness.scheduler.update(GHOST_JAIL_RELEASE_INTERVAL_MS);
      expect(releaseGhostSpy).toHaveBeenCalledTimes(3);
    } finally {
      harness.destroy();
    }
  });

  it('moves through side staging then crosses the jail gate before becoming free', () => {
    const harness = new MechanicsDomainHarness({ seed: 1919, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for phased release coverage');
      }

      harness.ghostReleaseSystem.start();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(true);

      const sideTargetX = harness.world.ghostJailBounds.minX;
      let reachedSideTarget = false;
      for (let tick = 0; tick < 800 && !ghost.state.free; tick += 1) {
        harness.ghostReleaseSystem.update();
        if (ghost.tile.x === sideTargetX && ghost.moved.x === 0) {
          reachedSideTarget = true;
        }
      }

      expect(reachedSideTarget).toBe(true);
      expect(ghost.state.free).toBe(true);
      expect(ghost.tile.y).toBe(harness.world.ghostJailBounds.y - 1);
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(false);
    } finally {
      harness.destroy();
    }
  });

  it('alternates release-side direction deterministically (left first, then right)', () => {
    const harness = new MechanicsDomainHarness({ seed: 2020, fixture: 'default-map', ghostCount: 2, autoStartSystems: false });

    try {
      const [firstGhost, secondGhost] = harness.world.ghosts;
      if (!firstGhost || !secondGhost) {
        throw new Error('expected two ghosts for side alternation test');
      }

      const centerX =
        harness.world.ghostJailBounds.minX +
        Math.floor((harness.world.ghostJailBounds.maxX - harness.world.ghostJailBounds.minX) / 2);
      harness.movementRules.setEntityTile(firstGhost, { x: centerX, y: harness.world.ghostJailBounds.y });
      harness.movementRules.setEntityTile(secondGhost, { x: centerX, y: harness.world.ghostJailBounds.y });

      harness.ghostReleaseSystem.start();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
      harness.ghostReleaseSystem.update();
      expect(firstGhost.direction).toBe('left');

      for (let tick = 0; tick < 800 && !firstGhost.state.free; tick += 1) {
        harness.ghostReleaseSystem.update();
      }
      expect(firstGhost.state.free).toBe(true);

      harness.scheduler.update(GHOST_JAIL_RELEASE_INTERVAL_MS);
      harness.ghostReleaseSystem.update();
      expect(secondGhost.direction).toBe('right');
    } finally {
      harness.destroy();
    }
  });

  it('cleans up exiting state when a ghost deactivates mid-release phase', () => {
    const harness = new MechanicsDomainHarness({ seed: 2121, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for deactivation cleanup test');
      }

      harness.ghostReleaseSystem.start();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
      harness.ghostReleaseSystem.update();
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(true);
      ghost.active = false;

      harness.ghostReleaseSystem.update();

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
        getTilesAt: vi.fn(() => ({
          current: openTile(),
          up: openTile(),
          down: openTile(),
          left: openTile(),
          right: openTile(),
        })),
      },
      tileSize: 16,
    } as unknown as WorldState;

    ghost.x = 24;
    ghost.y = 24;

    const canMoveMock = vi.fn(() => true);
    const advanceEntityMock = vi.fn((entity: GhostEntity, direction: 'up' | 'down' | 'left' | 'right') => {
      if (direction === 'left') {
        entity.tile.x -= 1;
      } else if (direction === 'right') {
        entity.tile.x += 1;
      } else if (direction === 'up') {
        entity.tile.y -= 1;
      } else {
        entity.tile.y += 1;
      }
      entity.moved = { x: 0, y: 0 };
    });
    const syncEntityPositionMock = vi.fn();
    const setEntityTileMock = vi.fn();
    const movementRules = {
      canMove: canMoveMock,
      advanceEntity: advanceEntityMock,
      syncEntityPosition: syncEntityPositionMock,
      setEntityTile: setEntityTileMock,
    } as unknown as MovementRules;

    const jailService = {
      moveGhostInJail: vi.fn(),
    } as unknown as GhostJailService;

    const scheduler = new TimerSchedulerAdapter();
    const system = new GhostReleaseSystem(world, movementRules, jailService, scheduler, new SeededRandom(11));

    system.start();
    scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
    for (let tick = 0; tick < 8; tick += 1) {
      system.update();
    }

    expect(canMoveMock).toHaveBeenCalled();
    expect(advanceEntityMock).toHaveBeenCalled();
    expect(setEntityTileMock).toHaveBeenCalledWith(ghost, { x: 0, y: 0 });
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
