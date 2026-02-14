import { describe, expect, it } from 'vitest';
import { SPEED } from '../../config/constants';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

describe('mechanics scenarios: animation state', () => {
  it('MEC-ANI-001 scared toggle swaps animation and speed then restores defaults', () => {
    const scenario = getScenarioOrThrow('MEC-ANI-001');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
    });

    try {
      const ghost = harness.world.ghosts[0];
      expect(ghost).toBeDefined();
      if (!ghost) {
        throw new Error('missing ghost for animation scenario');
      }

      harness.setGhostScared(true, 0);
      harness.stepTick();

      const scaredPlayback = harness.world.ghostAnimations.get(ghost);
      harness.setGhostScared(false, 0);
      harness.stepTick();
      const restoredPlayback = harness.world.ghostAnimations.get(ghost);

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [...harness.trace, 'toggle scared on/off'],
          snapshotWindow: harness.snapshots.slice(-8),
          assertion: 'ghost speed and animation key should switch in scared mode and restore after',
        },
        () => {
          expect(scaredPlayback?.key).toBe('scaredIdle');
          expect(restoredPlayback?.key).toBe(`${ghost.key}Idle`);
          expect(ghost.speed).toBe(SPEED.ghost);
          expect(ghost.state.animation).toBe('default');
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
