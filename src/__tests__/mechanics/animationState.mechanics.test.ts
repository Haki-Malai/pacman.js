import { describe, expect, it } from 'vitest';
import { GHOST_SCARED_DURATION_MS, GHOST_SCARED_WARNING_DURATION_MS, SPEED } from '../../config/constants';
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

  it('MEC-ANI-002 pacman eat animation is event-driven (not movement-driven)', () => {
    const harness = new MechanicsDomainHarness({
      seed: 20260222,
      fixture: 'portal-pair-grid',
      ghostCount: 0,
    });

    try {
      const observedFrames = new Set<number>();
      for (let tick = 0; tick < 20; tick += 1) {
        harness.stepTick();
        observedFrames.add(harness.world.pacmanAnimation.frame);
      }

      expect(observedFrames).toEqual(new Set([0]));

      harness.world.pacmanAnimation.active = true;
      const triggeredFrames: number[] = [];
      for (let tick = 0; tick < 4; tick += 1) {
        harness.animationSystem.update(1000 / 20);
        triggeredFrames.push(harness.world.pacmanAnimation.frame);
      }

      expect(triggeredFrames.some((frame) => frame > 0)).toBe(true);
      expect(harness.world.pacmanAnimation.active).toBe(true);

      for (let tick = 0; tick < 8; tick += 1) {
        harness.animationSystem.update(1000 / 20);
      }

      expect(harness.world.pacmanAnimation.active).toBe(false);
      expect(harness.world.pacmanAnimation.frame).toBe(0);
      expect(harness.world.pacmanAnimation.sequenceIndex).toBe(0);
    } finally {
      harness.destroy();
    }
  });

  it('MEC-ANI-003 scared warning starts near expiry and clears on scared end', () => {
    const scenario = getScenarioOrThrow('MEC-ANI-003');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      expect(ghost).toBeDefined();
      if (!ghost) {
        throw new Error('missing ghost for scared recovery scenario');
      }

      ghost.state.free = true;
      harness.animationSystem.start();
      harness.setGhostScared(true, 0);
      harness.animationSystem.update(GHOST_SCARED_DURATION_MS - GHOST_SCARED_WARNING_DURATION_MS + 1);

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [...harness.trace, 'advance scared timer into warning phase and to expiry'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'ghost warning visual state should toggle before expiry and clear when scared ends',
        },
        () => {
          expect(harness.world.ghostScaredWarnings.has(ghost)).toBe(true);

          const initialShowBaseColor = harness.world.ghostScaredWarnings.get(ghost)?.showBaseColor ?? false;
          let toggled = false;
          for (let i = 0; i < 8; i += 1) {
            harness.animationSystem.update(80);
            const currentShowBaseColor = harness.world.ghostScaredWarnings.get(ghost)?.showBaseColor ?? initialShowBaseColor;
            if (currentShowBaseColor !== initialShowBaseColor) {
              toggled = true;
              break;
            }
          }

          expect(toggled).toBe(true);
          harness.animationSystem.update(GHOST_SCARED_WARNING_DURATION_MS);
          expect(harness.world.ghostScaredWarnings.has(ghost)).toBe(false);
          expect(ghost.state.scared).toBe(false);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
