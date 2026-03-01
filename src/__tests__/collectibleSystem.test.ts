import { beforeEach, describe, expect, it } from 'vitest';
import { GHOST_SCARED_DURATION_MS } from '../config/constants';
import { resetGameState } from '../state/gameState';
import { CollectiblePoint, CollectibleSystem } from '../game/systems/CollectibleSystem';
import { WorldState } from '../game/domain/world/WorldState';
import { MechanicsDomainHarness } from './helpers/mechanicsDomainHarness';

interface CollectibleSystemInternals {
  pointsByTile: Map<string, CollectiblePoint>;
}

function injectPowerPointAtPacmanTile(collectibleSystem: CollectibleSystem, world: WorldState): void {
  const internals = collectibleSystem as unknown as CollectibleSystemInternals;
  internals.pointsByTile.clear();

  const tile = { ...world.pacman.tile };
  const center = {
    x: tile.x * world.tileSize + world.tileSize / 2,
    y: tile.y * world.tileSize + world.tileSize / 2,
  };

  internals.pointsByTile.set(`${tile.x},${tile.y}`, {
    tile,
    x: center.x,
    y: center.y,
    kind: 'power',
  });
}

describe('CollectibleSystem power-point scared behavior', () => {
  beforeEach(() => {
    resetGameState(0, 3);
  });

  it('sets scared timers for active ghosts and resets chain on power-point consume', () => {
    const harness = new MechanicsDomainHarness({ seed: 5201, fixture: 'default-map', ghostCount: 2, autoStartSystems: false });

    try {
      const [activeGhost, inactiveGhost] = harness.world.ghosts;
      if (!activeGhost || !inactiveGhost) {
        throw new Error('expected two ghosts');
      }

      inactiveGhost.active = false;
      harness.world.ghostEatChainCount = 3;

      const collectibleSystem = new CollectibleSystem(harness.world);
      injectPowerPointAtPacmanTile(collectibleSystem, harness.world);

      collectibleSystem.update(16);

      expect(activeGhost.state.scared).toBe(true);
      expect(harness.world.ghostScaredTimers.get(activeGhost)).toBe(GHOST_SCARED_DURATION_MS);
      expect(harness.world.ghostScaredWarnings.has(activeGhost)).toBe(false);

      expect(inactiveGhost.state.scared).toBe(false);
      expect(harness.world.ghostScaredTimers.has(inactiveGhost)).toBe(false);
      expect(harness.world.ghostEatChainCount).toBe(0);
    } finally {
      harness.destroy();
    }
  });

  it('refreshes scared timer and clears warning toggle state on subsequent power-point consume', () => {
    const harness = new MechanicsDomainHarness({ seed: 5202, fixture: 'default-map', ghostCount: 1, autoStartSystems: false });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost');
      }

      ghost.state.scared = true;
      harness.world.ghostScaredTimers.set(ghost, 200);
      harness.world.ghostScaredWarnings.set(ghost, {
        elapsedMs: 900,
        nextToggleAtMs: 1000,
        showBaseColor: true,
      });
      harness.world.ghostEatChainCount = 2;

      const collectibleSystem = new CollectibleSystem(harness.world);
      injectPowerPointAtPacmanTile(collectibleSystem, harness.world);

      collectibleSystem.update(16);

      expect(harness.world.ghostScaredTimers.get(ghost)).toBe(GHOST_SCARED_DURATION_MS);
      expect(harness.world.ghostScaredWarnings.has(ghost)).toBe(false);
      expect(harness.world.ghostEatChainCount).toBe(0);
    } finally {
      harness.destroy();
    }
  });
});
