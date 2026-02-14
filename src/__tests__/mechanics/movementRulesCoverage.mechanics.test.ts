import { describe, expect, it } from 'vitest';
import { openTile } from '../fixtures/collisionFixtures';
import {
  advanceEntity,
  applyBufferedDirection,
  canMove,
  DEFAULT_TILE_SIZE,
  getAvailableDirections,
  MovementRules,
  setEntityTile,
  syncEntityPosition,
  toWorldPosition,
} from '../../game/domain/services/MovementRules';
import { CollisionTiles } from '../../game/domain/world/CollisionGrid';

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

describe('movement rules coverage', () => {
  it('covers direction fallback and class wrapper branches', () => {
    const collision = tiles({
      up: openTile({ down: true }),
      down: openTile({ up: true }),
      right: openTile({ left: true }),
      left: openTile({ right: false }),
    });

    const available = getAvailableDirections(collision, 'right', DEFAULT_TILE_SIZE, 'pacman');
    expect(available).toEqual(['left']);

    const noFallback = getAvailableDirections(
      tiles({
        current: openTile({ left: true, right: true, up: true, down: true }),
        up: openTile({ down: true }),
        down: openTile({ up: true }),
        left: openTile({ right: true }),
        right: openTile({ left: true }),
      }),
      'right',
      DEFAULT_TILE_SIZE,
      'pacman',
    );
    expect(noFallback).toEqual([]);

    expect(canMove('unknown' as never, 0, 0, tiles())).toBe(true);
    expect(
      canMove(
        'down',
        0,
        0,
        tiles({
          current: openTile({ down: true, penGate: true }),
          down: openTile({ up: false }),
        }),
        DEFAULT_TILE_SIZE,
        'ghost',
      ),
    ).toBe(true);

    const rules = new MovementRules(DEFAULT_TILE_SIZE);
    expect(rules.canMove('left', 0, 0, collision, 'pacman')).toBe(true);
    expect(rules.getAvailableDirections(collision, 'right', 'pacman')).toEqual(['left']);
  });

  it('covers buffered direction branches and position sync helpers', () => {
    const centered = {
      moved: { x: 0, y: 0 },
      direction: { current: 'right' as const, next: 'up' as const },
    };

    const sameDirection = {
      moved: { x: 0, y: 0 },
      direction: { current: 'left' as const, next: 'left' as const },
    };

    const offCenter = {
      moved: { x: 2, y: 0 },
      direction: { current: 'left' as const, next: 'up' as const },
    };

    expect(applyBufferedDirection(sameDirection, tiles())).toBe('left');
    expect(applyBufferedDirection(offCenter, tiles())).toBe('left');
    expect(applyBufferedDirection(centered, tiles())).toBe('up');

    const rules = new MovementRules(DEFAULT_TILE_SIZE);
    const horizontalTurn = {
      moved: { x: 0, y: 0 },
      direction: { current: 'up' as const, next: 'left' as const },
    };
    expect(rules.applyBufferedDirection(horizontalTurn, tiles())).toBe('left');

    const entity = {
      x: 0,
      y: 0,
      tile: { x: 1, y: 2 },
      moved: { x: 3, y: -2 },
    };

    const world = toWorldPosition(entity.tile, entity.moved, DEFAULT_TILE_SIZE);
    expect(world).toEqual({ x: 27, y: 38 });

    syncEntityPosition(entity, DEFAULT_TILE_SIZE);
    expect(entity.x).toBe(27);
    expect(entity.y).toBe(38);

    setEntityTile(entity, { x: 3, y: 4 }, DEFAULT_TILE_SIZE);
    expect(entity.tile).toEqual({ x: 3, y: 4 });
    expect(entity.moved).toEqual({ x: 0, y: 0 });
  });

  it('covers movement advancing loops in all axes and wrapper methods', () => {
    const entity = {
      x: 0,
      y: 0,
      tile: { x: 0, y: 0 },
      moved: { x: 0, y: 0 },
    };

    advanceEntity(entity, 'right', DEFAULT_TILE_SIZE * 2 + 3, DEFAULT_TILE_SIZE);
    expect(entity.tile.x).toBe(2);
    expect(entity.moved.x).toBe(3);

    advanceEntity(entity, 'left', DEFAULT_TILE_SIZE * 2 + 5, DEFAULT_TILE_SIZE);
    expect(entity.tile.x).toBe(0);
    expect(entity.moved.x).toBe(-2);

    advanceEntity(entity, 'down', DEFAULT_TILE_SIZE + 1, DEFAULT_TILE_SIZE);
    expect(entity.tile.y).toBe(1);
    expect(entity.moved.y).toBe(1);

    advanceEntity(entity, 'up', DEFAULT_TILE_SIZE + 5, DEFAULT_TILE_SIZE);
    expect(entity.tile.y).toBe(0);
    expect(entity.moved.y).toBe(-4);

    const rules = new MovementRules(DEFAULT_TILE_SIZE);
    rules.advanceEntity(entity, 'up', 2);
    rules.syncEntityPosition(entity);
    rules.setEntityTile(entity, { x: 2, y: 2 });
    expect(entity.tile).toEqual({ x: 2, y: 2 });
  });
});
