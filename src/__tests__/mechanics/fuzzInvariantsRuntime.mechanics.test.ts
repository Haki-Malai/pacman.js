import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createSimulationGrid } from '../fixtures/collisionFixtures';
import { readMechanicsSpec } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';
import { simulateGhostMovement } from '../../game/domain/services/GhostDecisionService';
import { SeededRandom } from '../../game/shared/random/SeededRandom';

const SCENARIO_FILTER = process.env.MECHANICS_SCENARIO_ID;
const SEED_OVERRIDE = process.env.MECHANICS_SEED ? Number(process.env.MECHANICS_SEED) : undefined;
const BASE_RUNS = Number(process.env.MECHANICS_FUZZ_RUNS ?? 40);
const RUN_MULTIPLIER = Number(process.env.MECHANICS_FUZZ_MULTIPLIER ?? 1);

function runs(base: number): number {
  return Math.max(1, Math.round(base * RUN_MULTIPLIER));
}

function isFiltered(id: string): boolean {
  return Boolean(SCENARIO_FILTER && SCENARIO_FILTER !== id);
}

function fcOptions(numRuns: number): fc.Parameters<[number, number]> {
  const options: fc.Parameters<[number, number]> = {
    numRuns,
  };
  if (SEED_OVERRIDE !== undefined && Number.isFinite(SEED_OVERRIDE)) {
    options.seed = SEED_OVERRIDE;
  }
  return options;
}

function invariantExists(id: string): void {
  const spec = readMechanicsSpec();
  expect(spec.invariants.some((invariant) => invariant.id === id)).toBe(true);
}

describe('mechanics invariants fuzz runtime/state', () => {
  it('INV-PAUSE-001 paused simulation freezes progression', () => {
    if (isFiltered('INV-PAUSE-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-PAUSE-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 5, max: 40 }), (seed, pausedTicks) => {
        const harness = new MechanicsDomainHarness({
          seed,
          fixture: 'portal-pair-grid',
          ghostCount: 1,
        });

        try {
          harness.runTicks(2);
          const beforePause = harness.snapshot();

          harness.pause();
          harness.runTicks(pausedTicks);
          const duringPause = harness.snapshot();

          runMechanicsAssertion(
            {
              scenarioId: 'INV-PAUSE-001',
              seed,
              tick: duringPause.tick,
              inputTrace: [...harness.trace, `pausedTicks=${pausedTicks}`],
              snapshotWindow: harness.snapshots.slice(-10),
              assertion: 'paused ticks should not advance world tick or movement',
            },
            () => {
              expect(duringPause.tick).toBe(beforePause.tick);
              expect(duringPause.pacman.world).toEqual(beforePause.pacman.world);
            },
          );
        } finally {
          harness.destroy();
        }
      }),
      fcOptions(runs(BASE_RUNS)),
    );
  });

  it('INV-RNG-001 seeded simulation is deterministic', () => {
    if (isFiltered('INV-RNG-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-RNG-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 10, max: 180 }), (seed, steps) => {
        const grid = createSimulationGrid(9);

        const runA = simulateGhostMovement({
          collisionGrid: grid,
          steps,
          rng: new SeededRandom(seed),
          tileSize: 16,
          startTile: { x: 4, y: 4 },
          startDirection: 'left',
        });

        const runB = simulateGhostMovement({
          collisionGrid: grid,
          steps,
          rng: new SeededRandom(seed),
          tileSize: 16,
          startTile: { x: 4, y: 4 },
          startDirection: 'left',
        });

        runMechanicsAssertion(
          {
            scenarioId: 'INV-RNG-001',
            seed,
            tick: steps,
            inputTrace: [`steps=${steps}`],
            snapshotWindow: [],
            assertion: 'same seed should produce identical trajectories',
          },
          () => {
            expect(runA).toEqual(runB);
          },
        );
      }),
      fcOptions(runs(BASE_RUNS * 2)),
    );
  });
});
