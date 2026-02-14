import { describe, expect, it } from 'vitest';
import { createPenGateGrid, openTile } from '../fixtures/collisionFixtures';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { applyBufferedDirection, canMove, DEFAULT_TILE_SIZE } from '../../game/domain/services/MovementRules';
import { CollisionTiles } from '../../game/domain/world/CollisionGrid';

function collisionTiles(overrides?: Partial<CollisionTiles>): CollisionTiles {
  return {
    current: openTile(),
    up: openTile(),
    down: openTile(),
    left: openTile(),
    right: openTile(),
    ...overrides,
  };
}

describe('mechanics scenarios: pacman movement', () => {
  it('MEC-PAC-001 buffered turn applies only at tile center', () => {
    const scenario = getScenarioOrThrow('MEC-PAC-001');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 0,
        inputTrace: ['set next=up while centered'],
        snapshotWindow: [],
        assertion: 'buffered direction should apply at center',
      },
      () => {
        const pacman = {
          moved: { x: 0, y: 0 },
          direction: { current: 'right' as const, next: 'up' as const },
        };

        const result = applyBufferedDirection(pacman, collisionTiles(), DEFAULT_TILE_SIZE);

        expect(result).toBe('up');
        expect(pacman.direction.current).toBe('up');
      },
    );
  });

  it('MEC-PAC-002 blocked buffered turn is retained until legal', () => {
    const scenario = getScenarioOrThrow('MEC-PAC-002');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 0,
        inputTrace: ['set next=up while blocked'],
        snapshotWindow: [],
        assertion: 'blocked buffered turn should not replace current direction',
      },
      () => {
        const pacman = {
          moved: { x: 0, y: 0 },
          direction: { current: 'right' as const, next: 'up' as const },
        };

        const blocked = collisionTiles({
          current: openTile({ up: true }),
          up: openTile({ down: true }),
        });

        const result = applyBufferedDirection(pacman, blocked, DEFAULT_TILE_SIZE);

        expect(result).toBe('right');
        expect(pacman.direction.current).toBe('right');
      },
    );
  });

  it('MEC-PAC-003 blocked edge cannot be crossed from center but partial in-tile movement can finish', () => {
    const scenario = getScenarioOrThrow('MEC-PAC-003');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 0,
        inputTrace: ['attempt down through pen gate as pacman'],
        snapshotWindow: [],
        assertion: 'center crossing must be blocked while partial continuation is allowed',
      },
      () => {
        const grid = createPenGateGrid();
        const tiles = grid.getTilesAt({ x: 0, y: 1 });

        expect(canMove('down', 0, 0, tiles, DEFAULT_TILE_SIZE, 'pacman')).toBe(false);
        expect(canMove('down', 2, 0, tiles, DEFAULT_TILE_SIZE, 'pacman')).toBe(true);
        expect(canMove('down', DEFAULT_TILE_SIZE + 1, 0, tiles, DEFAULT_TILE_SIZE, 'pacman')).toBe(false);
      },
    );
  });
});
