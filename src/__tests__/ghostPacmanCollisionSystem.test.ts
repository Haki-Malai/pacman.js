import { beforeEach, describe, expect, it } from 'vitest';
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
      expectGhostTileUnchanged(ghost, ghostTileBefore);
    } finally {
      harness.destroy();
    }
  });

  it('still applies pacman-hit outcome when ghost is scared', () => {
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

      expect(getGameState().lives).toBe(2);
      expect(harness.world.pacman.tile).toEqual(harness.world.pacmanSpawnTile);
    } finally {
      harness.destroy();
    }
  });

  it('clamps lives at zero on repeated collisions', () => {
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

      harness.ghostPacmanCollisionSystem.update();
      expect(getGameState().lives).toBe(0);
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
