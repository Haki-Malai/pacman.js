import { BufferedEntity, CollisionTiles, Direction } from './types';

export const DEFAULT_TILE_SIZE = 16;

export type CanMoveFn = (
  _direction: Direction,
  _movedY: number,
  _movedX: number,
  _collisionTiles: CollisionTiles,
  _tileSize?: number,
) => boolean;

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export function canMove(
  direction: Direction,
  movedY: number,
  movedX: number,
  collisionTiles: CollisionTiles,
  tileSize: number = DEFAULT_TILE_SIZE,
): boolean {
  const current = collisionTiles.current;
  const down = collisionTiles.down;
  const right = collisionTiles.right;

  if (direction === 'up') {
    if (current.up) {
      return movedY < 0 && movedY >= -tileSize;
    }
    return true;
  }
  if (direction === 'down') {
    if (down.up) {
      return movedY > 0 && movedY <= tileSize;
    }
    return true;
  }
  if (direction === 'right') {
    if (right.left) {
      return movedX > 0 && movedX <= tileSize;
    }
    return true;
  }
  if (direction === 'left') {
    if (current.left) {
      return movedX < 0 && movedX >= -tileSize;
    }
    return true;
  }
  return true;
}

export function getAvailableDirections(
  collisionTiles: CollisionTiles,
  currentDirection: Direction,
  tileSize: number = DEFAULT_TILE_SIZE,
): Direction[] {
  const directions = DIRECTIONS.filter((direction) => {
    if (direction === OPPOSITES[currentDirection]) {
      return false;
    }
    return canMove(direction, 0, 0, collisionTiles, tileSize);
  });
  if (!directions.length) {
    const fallback = OPPOSITES[currentDirection];
    if (canMove(fallback, 0, 0, collisionTiles, tileSize)) {
      directions.push(fallback);
    }
  }
  return directions;
}

export function applyBufferedDirection(
  pacman: BufferedEntity,
  collisionTiles: CollisionTiles,
  tileSize: number = DEFAULT_TILE_SIZE,
  canMoveFn: CanMoveFn = canMove,
): Direction {
  const { current, next } = pacman.direction;
  if (next === current) {
    return current;
  }

  const moved = pacman.moved;
  if (moved.x !== 0 || moved.y !== 0) {
    return current;
  }

  if (canMoveFn(next, moved.y, moved.x, collisionTiles, tileSize)) {
    pacman.direction.current = next;
    if (next === 'left' || next === 'right') {
      pacman.moved.x = 0;
    } else {
      pacman.moved.y = 0;
    }
  }
  return pacman.direction.current;
}
