import { describe, expect, it, vi } from 'vitest';
import { applyBufferedDirection, canMove, DEFAULT_TILE_SIZE } from '../movement';
import { BufferedEntity, CollisionTile, CollisionTiles } from '../types';

const tileSize = DEFAULT_TILE_SIZE;
const tile = (overrides: Partial<CollisionTile> = {}): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
  ...overrides,
});

describe('canMove', () => {
  it('stops entry into a tile that blocks upward movement but allows finishing the step already taken', () => {
    const collisionTiles: CollisionTiles = {
      current: tile({ up: true }),
      down: tile({ up: false }),
      right: tile({ left: false }),
      left: tile(),
      up: tile(),
    };

    expect(canMove('up', 0, 0, collisionTiles, tileSize)).toBe(false);
    expect(canMove('up', -1, 0, collisionTiles, tileSize)).toBe(true);
    expect(canMove('up', -tileSize - 1, 0, collisionTiles, tileSize)).toBe(false);
  });

  it('uses the tile ahead to block downward movement', () => {
    const collisionTiles: CollisionTiles = {
      current: tile(),
      down: tile({ up: true }),
      right: tile({ left: false }),
      left: tile(),
      up: tile(),
    };

    expect(canMove('down', 0, 0, collisionTiles, tileSize)).toBe(false);
    expect(canMove('down', 5, 0, collisionTiles, tileSize)).toBe(true);
    expect(canMove('down', tileSize + 1, 0, collisionTiles, tileSize)).toBe(false);
  });

  it('respects walls on neighboring tiles when moving right but allows clear lateral travel otherwise', () => {
    const blockedRight: CollisionTiles = {
      current: tile(),
      down: tile(),
      right: tile({ left: true }),
      left: tile(),
      up: tile(),
    };
    const clearTiles: CollisionTiles = {
      current: tile({ left: false }),
      down: tile(),
      right: tile({ left: false }),
      left: tile(),
      up: tile(),
    };

    expect(canMove('right', 0, 0, blockedRight, tileSize)).toBe(false);
    expect(canMove('right', 0, 8, blockedRight, tileSize)).toBe(true);
    expect(canMove('right', 0, tileSize + 1, blockedRight, tileSize)).toBe(false);
    expect(canMove('left', 0, 0, clearTiles, tileSize)).toBe(true);
  });

  it('blocks movement when the current tile blocks the crossed edge', () => {
    const collisionTiles: CollisionTiles = {
      current: tile({ right: true }),
      down: tile(),
      right: tile(),
      left: tile(),
      up: tile(),
    };

    expect(canMove('right', 0, 0, collisionTiles, tileSize)).toBe(false);
    expect(canMove('right', 0, 4, collisionTiles, tileSize)).toBe(true);
  });

  it('blocks movement when the neighboring tile blocks the opposite edge', () => {
    const collisionTiles: CollisionTiles = {
      current: tile(),
      down: tile(),
      right: tile(),
      left: tile({ right: true }),
      up: tile(),
    };

    expect(canMove('left', 0, 0, collisionTiles, tileSize)).toBe(false);
    expect(canMove('left', 0, -4, collisionTiles, tileSize)).toBe(true);
  });

  it('allows ghosts through pen-gate edges but blocks pacman', () => {
    const collisionTiles: CollisionTiles = {
      current: tile({ down: true, penGate: true }),
      down: tile(),
      right: tile(),
      left: tile(),
      up: tile(),
    };

    expect(canMove('down', 0, 0, collisionTiles, tileSize, 'pacman')).toBe(false);
    expect(canMove('down', 0, 0, collisionTiles, tileSize, 'ghost')).toBe(true);
  });
});

describe('applyBufferedDirection', () => {
  const collisionTiles: CollisionTiles = {
    current: tile(),
    down: tile(),
    right: tile(),
    left: tile(),
    up: tile(),
  };

  it('switches to the buffered direction when centered and the path is open', () => {
    const pacman: BufferedEntity = { moved: { x: 0, y: 0 }, direction: { current: 'right', next: 'up' } };
    const canMoveSpy = vi.fn(() => true);

    const result = applyBufferedDirection(pacman, collisionTiles, tileSize, canMoveSpy);

    expect(result).toBe('up');
    expect(pacman.direction.current).toBe('up');
    expect(canMoveSpy).toHaveBeenCalledWith('up', 0, 0, collisionTiles, tileSize, 'pacman');
  });

  it('ignores buffered input until pacman is centered on a tile', () => {
    const pacman: BufferedEntity = { moved: { x: 4, y: 0 }, direction: { current: 'right', next: 'up' } };
    const canMoveSpy = vi.fn(() => true);

    const result = applyBufferedDirection(pacman, collisionTiles, tileSize, canMoveSpy);

    expect(result).toBe('right');
    expect(pacman.direction.current).toBe('right');
    expect(canMoveSpy).not.toHaveBeenCalled();
  });

  it('keeps the current direction if the buffered turn is blocked', () => {
    const pacman: BufferedEntity = { moved: { x: 0, y: 0 }, direction: { current: 'right', next: 'up' } };
    const canMoveSpy = vi.fn(() => false);

    const result = applyBufferedDirection(pacman, collisionTiles, tileSize, canMoveSpy);

    expect(result).toBe('right');
    expect(pacman.direction.current).toBe('right');
    expect(canMoveSpy).toHaveBeenCalledOnce();
  });
});
