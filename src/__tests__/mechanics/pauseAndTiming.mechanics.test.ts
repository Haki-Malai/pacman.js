import { describe, expect, it } from 'vitest';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

describe('mechanics scenarios: pause and timing', () => {
  it('MEC-TIME-001 pause freezes movement, timers, and tweens', () => {
    const scenario = getScenarioOrThrow('MEC-TIME-001');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'portal-pair-grid',
      ghostCount: 1,
    });

    try {
      const tweenTarget = { value: 0 };
      let fired = 0;

      harness.scheduler.delayedCall(100, () => {
        fired += 1;
      });

      harness.scheduler.addTween({
        target: tweenTarget,
        to: { value: 10 },
        durationMs: 100,
        ease: 'linear',
      });

      harness.runTicks(2);
      const beforePause = harness.snapshot();

      harness.pause();
      harness.runTicks(12);
      const duringPause = harness.snapshot();

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: duringPause.tick,
          inputTrace: [...harness.trace, 'pause then run paused ticks'],
          snapshotWindow: harness.snapshots.slice(-12),
          assertion: 'paused simulation should freeze tick, movement, timers, and tween progression',
        },
        () => {
          expect(duringPause.tick).toBe(beforePause.tick);
          expect(duringPause.pacman.world).toEqual(beforePause.pacman.world);
          expect(fired).toBe(0);
          expect(tweenTarget.value).toBeLessThan(10);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-TIME-002 resume continues from frozen elapsed state', () => {
    const scenario = getScenarioOrThrow('MEC-TIME-002');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'portal-pair-grid',
      ghostCount: 1,
    });

    try {
      const tweenTarget = { value: 0 };
      let fired = 0;

      harness.scheduler.delayedCall(100, () => {
        fired += 1;
      });

      harness.scheduler.addTween({
        target: tweenTarget,
        to: { value: 10 },
        durationMs: 100,
        ease: 'linear',
      });

      harness.pause();
      harness.runTicks(8);
      const paused = harness.snapshot();

      harness.resume();
      harness.runTicks(8);
      const resumed = harness.snapshot();

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: resumed.tick,
          inputTrace: [...harness.trace, 'resume then run active ticks'],
          snapshotWindow: harness.snapshots.slice(-12),
          assertion: 'resumed simulation should continue scheduler and movement from frozen state',
        },
        () => {
          expect(resumed.tick).toBeGreaterThan(paused.tick);
          expect(resumed.pacman.world.x).toBeGreaterThanOrEqual(paused.pacman.world.x);
          expect(fired).toBe(1);
          expect(tweenTarget.value).toBeCloseTo(10, 5);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
