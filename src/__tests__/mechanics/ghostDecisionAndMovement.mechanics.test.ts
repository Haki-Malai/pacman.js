import { describe, expect, it } from 'vitest';
import { createSimulationGrid, openTile } from '../fixtures/collisionFixtures';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { GhostDecisionService, simulateGhostMovement } from '../../game/domain/services/GhostDecisionService';
import { CollisionTiles } from '../../game/domain/world/CollisionGrid';
import { SeededRandom } from '../../game/shared/random/SeededRandom';

const TILE_SIZE = 16;

function tiles(overrides?: Partial<CollisionTiles>): CollisionTiles {
  return {
    current: openTile(),
    up: openTile(),
    down: openTile(),
    left: openTile(),
    right: openTile(),
    ...overrides,
  };
}

describe('mechanics scenarios: ghost decision and movement', () => {
  it('MEC-GHO-001 excludes reverse direction at center when alternatives exist', () => {
    const scenario = getScenarioOrThrow('MEC-GHO-001');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 0,
        inputTrace: ['ghost center decision current=right'],
        snapshotWindow: [],
        assertion: 'center decision should not choose reverse direction if alternatives exist',
      },
      () => {
        const service = new GhostDecisionService();
        const rng = new SeededRandom(scenario.seed);
        const collision = tiles({
          left: openTile({ right: false }),
          right: openTile({ left: false }),
          up: openTile({ down: false }),
          down: openTile({ up: false }),
        });

        const direction = service.chooseDirectionAtCenter('right', collision, TILE_SIZE, rng);

        expect(direction).not.toBe('left');
        expect(['right', 'up', 'down']).toContain(direction);
      },
    );
  });

  it('MEC-GHO-002 chooses perpendicular when blocked, otherwise reverse fallback', () => {
    const scenario = getScenarioOrThrow('MEC-GHO-002');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 0,
        inputTrace: ['ghost blocked decision current=right'],
        snapshotWindow: [],
        assertion: 'blocked decision should pick perpendicular before reverse fallback',
      },
      () => {
        const service = new GhostDecisionService();
        const rng = new SeededRandom(scenario.seed);

        const perpendicularAvailable = tiles({
          current: openTile({ right: true, up: false, down: true, left: false }),
          right: openTile({ left: true }),
          up: openTile({ down: false }),
          down: openTile({ up: true }),
          left: openTile({ right: false }),
        });

        const pickPerpendicular = service.chooseDirectionWhenBlocked('right', 0, 0, perpendicularAvailable, TILE_SIZE, rng);
        expect(pickPerpendicular).toBe('up');

        const reverseOnly = tiles({
          current: openTile({ right: true, up: true, down: true, left: false }),
          right: openTile({ left: true }),
          up: openTile({ down: true }),
          down: openTile({ up: true }),
          left: openTile({ right: false }),
        });

        const pickReverse = service.chooseDirectionWhenBlocked('right', 0, 0, reverseOnly, TILE_SIZE, rng);
        expect(pickReverse).toBe('left');
      },
    );
  });

  it('MEC-GHO-003 seeded ghost simulation is deterministic', () => {
    const scenario = getScenarioOrThrow('MEC-GHO-003');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: scenario.ticks,
        inputTrace: ['simulate ghost movement with equal and different seeds'],
        snapshotWindow: [],
        assertion: 'same seed should match, different seed should diverge',
      },
      () => {
        const grid = createSimulationGrid(9);

        const runA = simulateGhostMovement({
          collisionGrid: grid,
          steps: scenario.ticks,
          rng: new SeededRandom(scenario.seed),
          tileSize: TILE_SIZE,
          startTile: { x: 4, y: 4 },
          startDirection: 'left',
        });

        const runB = simulateGhostMovement({
          collisionGrid: grid,
          steps: scenario.ticks,
          rng: new SeededRandom(scenario.seed),
          tileSize: TILE_SIZE,
          startTile: { x: 4, y: 4 },
          startDirection: 'left',
        });

        const runC = simulateGhostMovement({
          collisionGrid: grid,
          steps: scenario.ticks,
          rng: new SeededRandom(scenario.seed + 1),
          tileSize: TILE_SIZE,
          startTile: { x: 4, y: 4 },
          startDirection: 'left',
        });

        expect(runA).toEqual(runB);
        expect(runA).not.toEqual(runC);
      },
    );
  });
});
