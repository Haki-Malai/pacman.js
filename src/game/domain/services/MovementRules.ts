import { CollisionTile, CollisionTiles } from '../world/CollisionGrid';
import { Direction, DIRECTIONS, DIRECTION_VECTORS, MovementActor, OPPOSITE_DIRECTION } from '../valueObjects/Direction';
import { MovementProgress } from '../valueObjects/MovementProgress';
import { TilePosition } from '../valueObjects/TilePosition';

export const DEFAULT_TILE_SIZE = 16;

export interface BufferedEntity {
  moved: MovementProgress;
  direction: {
    current: Direction;
    next: Direction;
  };
}

export interface MovableEntity {
  tile: TilePosition;
  moved: MovementProgress;
}

export interface PositionedEntity extends MovableEntity {
  x: number;
  y: number;
}

export type CanMoveFn = (
  _direction: Direction,
  _movedY: number,
  _movedX: number,
  _collisionTiles: CollisionTiles,
  _tileSize?: number,
  _actor?: MovementActor,
) => boolean;

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
    if (direction === OPPOSITE_DIRECTION[currentDirection]) {
      return false;
    }
    return canMove(direction, 0, 0, collisionTiles, tileSize, actor);
  });

  if (!directions.length) {
    const fallback = OPPOSITE_DIRECTION[currentDirection];
    if (canMove(fallback, 0, 0, collisionTiles, tileSize, actor)) {
      directions.push(fallback);
    }
  }

  return directions;
}

export function applyBufferedDirection(
  entity: BufferedEntity,
  collisionTiles: CollisionTiles,
  tileSize: number = DEFAULT_TILE_SIZE,
  canMoveFn: CanMoveFn = canMove,
): Direction {
  const { current, next } = entity.direction;
  if (next === current) {
    return current;
  }

  if (entity.moved.x !== 0 || entity.moved.y !== 0) {
    return current;
  }

  if (canMoveFn(next, entity.moved.y, entity.moved.x, collisionTiles, tileSize, 'pacman')) {
    entity.direction.current = next;
    if (next === 'left' || next === 'right') {
      entity.moved.x = 0;
    } else {
      entity.moved.y = 0;
    }
  }

  return entity.direction.current;
}

export function advanceEntity(entity: MovableEntity, direction: Direction, speed: number, tileSize: number): void {
  const delta = DIRECTION_VECTORS[direction];
  entity.moved.x += delta.dx * speed;
  entity.moved.y += delta.dy * speed;

  while (entity.moved.x >= tileSize) {
    entity.tile.x += 1;
    entity.moved.x -= tileSize;
  }

  while (entity.moved.x <= -tileSize) {
    entity.tile.x -= 1;
    entity.moved.x += tileSize;
  }

  while (entity.moved.y >= tileSize) {
    entity.tile.y += 1;
    entity.moved.y -= tileSize;
  }

  while (entity.moved.y <= -tileSize) {
    entity.tile.y -= 1;
    entity.moved.y += tileSize;
  }
}

export function toWorldPosition(tile: TilePosition, moved: MovementProgress, tileSize: number): { x: number; y: number } {
  const tileCenterOffset = tileSize / 2;
  return {
    x: tile.x * tileSize + tileCenterOffset + moved.x,
    y: tile.y * tileSize + tileCenterOffset + moved.y,
  };
}

export function syncEntityPosition(entity: PositionedEntity, tileSize: number): void {
  const world = toWorldPosition(entity.tile, entity.moved, tileSize);
  entity.x = world.x;
  entity.y = world.y;
}

export function setEntityTile(entity: PositionedEntity, tile: TilePosition, tileSize: number): void {
  entity.tile = { ...tile };
  entity.moved = { x: 0, y: 0 };
  syncEntityPosition(entity, tileSize);
}

export class MovementRules {
  constructor(private readonly tileSize: number = DEFAULT_TILE_SIZE) {}

  canMove(
    direction: Direction,
    movedY: number,
    movedX: number,
    collisionTiles: CollisionTiles,
    actor: MovementActor = 'pacman',
  ): boolean {
    return canMove(direction, movedY, movedX, collisionTiles, this.tileSize, actor);
  }

  getAvailableDirections(collisionTiles: CollisionTiles, currentDirection: Direction, actor: MovementActor): Direction[] {
    return getAvailableDirections(collisionTiles, currentDirection, this.tileSize, actor);
  }

  applyBufferedDirection(entity: BufferedEntity, collisionTiles: CollisionTiles): Direction {
    return applyBufferedDirection(entity, collisionTiles, this.tileSize, (direction, movedY, movedX, tiles, tileSize, actor) =>
      canMove(direction, movedY, movedX, tiles, tileSize, actor),
    );
  }

  advanceEntity(entity: MovableEntity, direction: Direction, speed: number): void {
    advanceEntity(entity, direction, speed, this.tileSize);
  }

  syncEntityPosition(entity: PositionedEntity): void {
    syncEntityPosition(entity, this.tileSize);
  }

  setEntityTile(entity: PositionedEntity, tile: TilePosition): void {
    setEntityTile(entity, tile, this.tileSize);
  }
}
