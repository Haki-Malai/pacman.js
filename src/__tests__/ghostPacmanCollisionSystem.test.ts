import { beforeEach, describe, expect, it } from 'vitest';
import {
  GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS,
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_TWEEN_MS,
  PACMAN_DEATH_RECOVERY,
} from '../config/constants';
import { getGameState, resetGameState } from '../state/gameState';
import { GhostEntity } from '../game/domain/entities/GhostEntity';
import { MechanicsDomainHarness } from './helpers/mechanicsDomainHarness';

function expectGhostTileUnchanged(ghost: GhostEntity, tile: { x: number; y: number }): void {
  expect(ghost.tile).toEqual(tile);
}

describe('GhostPacmanCollisionSystem', () => {
  beforeEach(() => {
    resetGameState(0, 3);
  });

  it('decrements one life and respawns pacman without moving the colliding ghost', () => {
    const harness = new MechanicsDomainHarness({ seed: 4101, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost');
      }

      harness.movementRules.setEntityTile(harness.world.pacman, { x: 20, y: 20 });
      harness.world.pacman.direction.current = 'up';
      harness.world.pacman.direction.next = 'left';

      harness.movementRules.setEntityTile(ghost, { x: 20, y: 20 });
      ghost.state.free = true;
      ghost.state.scared = false;

      const ghostTileBefore = { ...ghost.tile };

      harness.ghostPacmanCollisionSystem.update();

      expect(getGameState().lives).toBe(2);
      expect(harness.world.pacman.tile).toEqual(harness.world.pacmanSpawnTile);
      expect(harness.world.pacman.direction.current).toBe('right');
      expect(harness.world.pacman.direction.next).toBe('right');
      expect(harness.world.pacman.deathRecoveryRemainingMs).toBe(PACMAN_DEATH_RECOVERY.durationMs);
      expect(harness.world.pacman.deathRecoveryVisible).toBe(true);
      expectGhostTileUnchanged(ghost, ghostTileBefore);
    } finally {
      harness.destroy();
    }
  });

  it('applies ghost-hit outcome when ghost is scared and re-enters normal jail release flow', () => {
    const harness = new MechanicsDomainHarness({ seed: 4102, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost');
      }

      harness.movementRules.setEntityTile(harness.world.pacman, { x: 18, y: 18 });
      harness.movementRules.setEntityTile(ghost, { x: 18, y: 18 });
      ghost.state.free = true;
      ghost.state.scared = true;

      harness.ghostPacmanCollisionSystem.update();

      expect(getGameState().lives).toBe(3);
      expect(getGameState().score).toBe(200);
      expect(ghost.tile).toEqual(harness.world.ghostJailReturnTile);
      expect(ghost.state.free).toBe(false);
      expect(ghost.state.scared).toBe(false);
      expect(ghost.state.soonFree).toBe(true);

      harness.ghostReleaseSystem.update();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS - 1);
      expect(ghost.state.free).toBe(false);

      harness.scheduler.update(1);
      expect(harness.world.ghostsExitingJail.has(ghost)).toBe(true);

      harness.scheduler.update(GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS + 50);
      harness.scheduler.update(GHOST_JAIL_RELEASE_TWEEN_MS + 50);
      expect(ghost.state.free).toBe(true);
      expect(ghost.state.soonFree).toBe(false);
    } finally {
      harness.destroy();
    }
  });

  it('clamps lives at zero when additional collisions happen after recovery expires', () => {
    const harness = new MechanicsDomainHarness({ seed: 4103, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      resetGameState(0, 1);
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost');
      }

      harness.movementRules.setEntityTile(harness.world.pacman, harness.world.pacmanSpawnTile);
      harness.movementRules.setEntityTile(ghost, harness.world.pacmanSpawnTile);
      ghost.state.free = true;

      harness.ghostPacmanCollisionSystem.update();
      expect(getGameState().lives).toBe(0);

      harness.world.pacman.deathRecoveryRemainingMs = 0;
      harness.ghostPacmanCollisionSystem.update();
      expect(getGameState().lives).toBe(0);
    } finally {
      harness.destroy();
    }
  });

  it('ignores collisions while Pac-Man death recovery invulnerability is active', () => {
    const harness = new MechanicsDomainHarness({ seed: 4105, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost');
      }

      harness.movementRules.setEntityTile(harness.world.pacman, { x: 13, y: 13 });
      harness.movementRules.setEntityTile(ghost, { x: 13, y: 13 });
      ghost.state.free = true;

      harness.ghostPacmanCollisionSystem.update();
      expect(getGameState().lives).toBe(2);

      harness.movementRules.setEntityTile(harness.world.pacman, { x: 13, y: 13 });
      harness.ghostPacmanCollisionSystem.update();
      expect(getGameState().lives).toBe(2);
    } finally {
      harness.destroy();
    }
  });

  it('applies at most one life loss when multiple ghosts collide in the same tick', () => {
    const harness = new MechanicsDomainHarness({ seed: 4104, fixture: 'default-map', ghostCount: 2, autoStartSystems: false });

    try {
      const [first, second] = harness.world.ghosts;
      if (!first || !second) {
        throw new Error('expected two ghosts');
      }

      harness.movementRules.setEntityTile(harness.world.pacman, { x: 24, y: 24 });
      harness.movementRules.setEntityTile(first, { x: 24, y: 24 });
      harness.movementRules.setEntityTile(second, { x: 24, y: 24 });
      first.state.free = true;
      second.state.free = true;

      harness.ghostPacmanCollisionSystem.update();

      expect(getGameState().lives).toBe(2);
    } finally {
      harness.destroy();
    }
  });
});
