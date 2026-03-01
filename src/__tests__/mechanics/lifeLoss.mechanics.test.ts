import { describe, expect, it } from 'vitest';
import { getGameState, resetGameState } from '../../state/gameState';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

describe('mechanics scenarios: life loss collision', () => {
  it('MEC-LIFE-001 ghost collision decrements one life and respawns pacman at spawn tile', () => {
    const scenario = getScenarioOrThrow('MEC-LIFE-001');
    resetGameState(0, 3);

    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for life loss scenario');
      }

      const collisionTile = { x: 21, y: 21 };
      harness.movementRules.setEntityTile(harness.world.pacman, collisionTile);
      harness.movementRules.setEntityTile(ghost, collisionTile);
      ghost.state.free = true;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['set pacman and one active ghost to same tile', 'run ghost-pacman collision system update'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'one collision should decrement one life and reset pacman to spawn without resetting ghost',
        },
        () => {
          harness.ghostPacmanCollisionSystem.update();

          const snapshot = harness.snapshot();
          expect(getGameState().lives).toBe(2);
          expect(snapshot.pacman.tile).toEqual(harness.world.pacmanSpawnTile);
          expect(snapshot.ghosts[0]?.tile).toEqual(collisionTile);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
