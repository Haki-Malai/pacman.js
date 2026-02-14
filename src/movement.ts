import { TILE_SIZE } from './config/constants';
import { BufferedEntity, CollisionTile, CollisionTiles, Direction, MovementActor } from './types';

export const DEFAULT_TILE_SIZE = TILE_SIZE;

export type CanMoveFn = (
  _direction: Direction,
  _movedY: number,
  _movedX: number,
  _collisionTiles: CollisionTiles,
  _tileSize?: number,
  _actor?: MovementActor,
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
  actor: MovementActor = 'pacman',
): boolean {
  const current = collisionTiles.current;
  const up = collisionTiles.up;
  const down = collisionTiles.down;
  const left = collisionTiles.left;
  const right = collisionTiles.right;
  const bypassPenGate = actor === 'ghost';

  const blocksEdge = (tile: CollisionTile, blocked: boolean): boolean => {
    if (!blocked) {
      return false;
    }
    if (bypassPenGate && tile.penGate) {
      return false;
    }
    return true;
  };

  if (direction === 'up') {
    if (blocksEdge(current, current.up) || blocksEdge(up, up.down)) {
      return movedY < 0 && movedY >= -tileSize;
    }
    return true;
  }
  if (direction === 'down') {
    if (blocksEdge(current, current.down) || blocksEdge(down, down.up)) {
      return movedY > 0 && movedY <= tileSize;
    }
    return true;
  }
  if (direction === 'right') {
    if (blocksEdge(current, current.right) || blocksEdge(right, right.left)) {
      return movedX > 0 && movedX <= tileSize;
    }
    return true;
  }
  if (direction === 'left') {
    if (blocksEdge(current, current.left) || blocksEdge(left, left.right)) {
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
  actor: MovementActor = 'pacman',
): Direction[] {
  const directions = DIRECTIONS.filter((direction) => {
    if (direction === OPPOSITES[currentDirection]) {
      return false;
    }
    return canMove(direction, 0, 0, collisionTiles, tileSize, actor);
  });
  if (!directions.length) {
    const fallback = OPPOSITES[currentDirection];
    if (canMove(fallback, 0, 0, collisionTiles, tileSize, actor)) {
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

  if (canMoveFn(next, moved.y, moved.x, collisionTiles, tileSize, 'pacman')) {
    pacman.direction.current = next;
    if (next === 'left' || next === 'right') {
      pacman.moved.x = 0;
    } else {
      pacman.moved.y = 0;
    }
  }
  return pacman.direction.current;
}
