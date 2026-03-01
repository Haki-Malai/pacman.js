import { describe, expect, it } from 'vitest';
import {
  GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS,
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_INTERVAL_MS,
  GHOST_JAIL_RELEASE_TWEEN_MS,
} from '../../config/constants';
import { getGameState, resetGameState } from '../../state/gameState';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

describe('mechanics scenarios: scared ghost eat flow', () => {
  it('MEC-GHO-004 scared ghost collision teleports to jail and re-enters staged release with chain score progression', () => {
    const scenario = getScenarioOrThrow('MEC-GHO-004');
    resetGameState(0, 3);

    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 2,
      autoStartSystems: false,
    });

    try {
      const [firstGhost, secondGhost] = harness.world.ghosts;
      if (!firstGhost || !secondGhost) {
        throw new Error('expected two ghosts for ghost eat scenario');
      }

      const firstCollisionTile = { x: 20, y: 20 };
      const secondCollisionTile = { x: 21, y: 20 };

      harness.movementRules.setEntityTile(harness.world.pacman, firstCollisionTile);
      harness.movementRules.setEntityTile(firstGhost, firstCollisionTile);
      harness.movementRules.setEntityTile(secondGhost, secondCollisionTile);

      firstGhost.state.free = true;
      firstGhost.state.scared = true;
      secondGhost.state.free = true;
      secondGhost.state.scared = true;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [
            'set two scared ghosts as collision targets',
            'eat first ghost then eat second ghost',
            'advance jail release delay and tween timers',
          ],
          snapshotWindow: [harness.snapshot()],
          assertion: 'ghosts should jail-return on eat and score should follow chain progression',
        },
        () => {
          harness.ghostPacmanCollisionSystem.update();
          harness.ghostReleaseSystem.update();
          expect(getGameState().score).toBe(200);
          expect(firstGhost.tile).toEqual(harness.world.ghostJailReturnTile);
          expect(firstGhost.state.free).toBe(false);

          harness.movementRules.setEntityTile(harness.world.pacman, secondCollisionTile);
          harness.ghostPacmanCollisionSystem.update();
          harness.ghostReleaseSystem.update();
          expect(getGameState().score).toBe(600);
          expect(secondGhost.tile).toEqual(harness.world.ghostJailReturnTile);
          expect(secondGhost.state.free).toBe(false);

          harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
          harness.scheduler.update(GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS + GHOST_JAIL_RELEASE_TWEEN_MS + 50);
          expect(firstGhost.state.free).toBe(true);

          harness.scheduler.update(GHOST_JAIL_RELEASE_INTERVAL_MS);
          harness.scheduler.update(GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS + GHOST_JAIL_RELEASE_TWEEN_MS + 50);
          expect(secondGhost.state.free).toBe(true);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
