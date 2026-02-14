import { describe, expect, it } from 'vitest';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

describe('mechanics scenarios: ghost jail and release', () => {
  it('MEC-JAIL-001 jailed ghosts oscillate within jail bounds before release', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-001');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
    });

    try {
      const result = harness.runScenario({ scenario });
      const bounds = harness.world.ghostJailBounds;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: result.finalSnapshot.tick,
          inputTrace: result.trace,
          snapshotWindow: result.snapshots.slice(-12),
          assertion: 'jailed ghost x should remain inside jail bounds before release delay expires',
        },
        () => {
          const xs = result.snapshots.map((snapshot) => snapshot.ghosts[0]?.tile.x ?? bounds.minX);
          const allInside = xs.every((x) => x >= bounds.minX && x <= bounds.maxX);

          expect(allInside).toBe(true);
          expect(harness.world.ghosts[0]?.state.free).toBe(false);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-JAIL-002 release timer and tween transition ghost to free state', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-002');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
    });

    try {
      const result = harness.runScenario({ scenario });

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: result.finalSnapshot.tick,
          inputTrace: result.trace,
          snapshotWindow: result.snapshots.slice(-12),
          assertion: 'ghost should become free after delay+tween and leave exiting set',
        },
        () => {
          const ghost = harness.world.ghosts[0];
          expect(ghost?.state.free).toBe(true);
          expect(ghost?.state.soonFree).toBe(false);
          expect(harness.world.ghostsExitingJail.size).toBe(0);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
