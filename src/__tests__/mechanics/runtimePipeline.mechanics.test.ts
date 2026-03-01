import { describe, expect, it } from 'vitest';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsRuntimeHarness } from '../helpers/mechanicsRuntimeHarness';

describe('mechanics scenarios: runtime pipeline', () => {
  it('MEC-RUN-001 runtime update order follows architecture contract and pause limits updates', async () => {
    const scenario = getScenarioOrThrow('MEC-RUN-001');
    const harness = new MechanicsRuntimeHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
    });

    try {
      await harness.start();
      harness.driveFrame(1);
      harness.driveFrame(20);

      const expectedOrder = [
        'InputSystem',
        'PacmanMovementSystem',
        'GhostReleaseSystem',
        'GhostMovementSystem',
        'GhostPacmanCollisionSystem',
        'AnimationSystem',
        'CameraSystem',
        'HudSystem',
        'DebugOverlaySystem',
      ];
      const activeOrder = [...harness.updateOrder];

      harness.pause();
      harness.clearOrder();
      harness.driveFrame(40);
      harness.driveFrame(60);
      const pausedUpdates = [...harness.updateOrder];

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.domainHarness.world.tick,
          inputTrace: [
            'start runtime',
            'drive frames at 1ms and 20ms',
            'pause runtime',
            'drive frames at 40ms and 60ms',
          ],
          snapshotWindow: [harness.domainHarness.snapshot()],
          assertion: 'runtime should respect system order and only run pause-enabled systems while paused',
        },
        () => {
          expect(activeOrder.slice(0, expectedOrder.length)).toEqual(expectedOrder);
          expect(pausedUpdates.every((name) => name === 'DebugOverlaySystem')).toBe(true);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
