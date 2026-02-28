import { GhostEntity } from '../entities/GhostEntity';
import { Direction } from '../valueObjects/Direction';
import { TilePosition } from '../valueObjects/TilePosition';
import { WorldMapData, WorldObject } from '../world/WorldState';
import { CollisionGrid } from '../world/CollisionGrid';
import { MovementRules } from './MovementRules';
import { RandomSource } from '../../shared/random/RandomSource';

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function getObjectNumberProperty(obj: WorldObject | undefined, name: string): number | undefined {
  const property = obj?.properties?.find((entry) => entry.name === name);
  return typeof property?.value === 'number' ? property.value : undefined;
}

export class GhostJailService {
  resolveSpawnTile(objectTile: WorldObject | undefined, fallback: TilePosition, map: WorldMapData): TilePosition {
    const gridX = getObjectNumberProperty(objectTile, 'gridX');
    const gridY = getObjectNumberProperty(objectTile, 'gridY');

    if (typeof gridX === 'number' && typeof gridY === 'number') {
      return this.clampTilePosition({ x: gridX, y: gridY }, map);
    }

    if (objectTile && typeof objectTile.x === 'number' && typeof objectTile.y === 'number') {
      return this.clampTilePosition(
        {
          x: Math.floor(objectTile.x / map.tileWidth),
          y: Math.floor(objectTile.y / map.tileHeight),
        },
        map,
      );
    }

    return this.clampTilePosition(fallback, map);
  }

  resolveGhostJailBounds(map: WorldMapData, fallbackTile: TilePosition): { minX: number; maxX: number; y: number } {
    const ghostStartXRaw = getObjectNumberProperty(map.ghostHome, 'startX') ?? fallbackTile.x;
    const ghostEndXRaw = getObjectNumberProperty(map.ghostHome, 'endX') ?? fallbackTile.x;
    const minX = clamp(Math.round(Math.min(ghostStartXRaw, ghostEndXRaw)), 0, map.width - 1);
    const maxX = clamp(Math.round(Math.max(ghostStartXRaw, ghostEndXRaw)), 0, map.width - 1);

    const ghostGridY = getObjectNumberProperty(map.ghostHome, 'gridY');
    const ghostYRaw =
      typeof ghostGridY === 'number'
        ? ghostGridY
        : map.ghostHome && typeof map.ghostHome.y === 'number'
          ? Math.round(map.ghostHome.y / map.tileHeight)
          : fallbackTile.y;

    const y = clamp(ghostYRaw, 0, map.height - 1);

    return { minX, maxX, y };
  }

  findReleaseTile(params: {
    currentTile: TilePosition;
    avoidTile: TilePosition;
    bounds: { minX: number; maxX: number; y: number };
    map: WorldMapData;
    collisionGrid: CollisionGrid;
    movementRules: MovementRules;
    rng: RandomSource;
    preferDirection?: 'left' | 'right';
  }): TilePosition {
    const releaseY = clamp(params.bounds.y - 1, 0, params.map.height - 1);
    const candidates: TilePosition[] = [];

    for (let x = params.bounds.minX; x <= params.bounds.maxX; x += 1) {
      const tile = { x, y: releaseY };
      if (tile.x === params.avoidTile.x && tile.y === params.avoidTile.y) {
        continue;
      }

      if (this.canGhostMoveFromTile(tile, params.collisionGrid, params.movementRules)) {
        candidates.push(tile);
      }
    }

    const fallback = this.clampTilePosition({ x: params.currentTile.x, y: releaseY }, params.map);
    if (candidates.length === 0) {
      return fallback;
    }

    const currentX = clamp(params.currentTile.x, params.bounds.minX, params.bounds.maxX);
    const nearestDistance = candidates.reduce((distance, tile) => {
      return Math.min(distance, Math.abs(tile.x - currentX));
    }, Number.POSITIVE_INFINITY);

    const nearestCandidates = candidates.filter((tile) => Math.abs(tile.x - currentX) === nearestDistance);

    if (params.preferDirection === 'right') {
      const rightCandidate = [...nearestCandidates].sort((a, b) => b.x - a.x)[0];
      return rightCandidate ?? fallback;
    }

    if (params.preferDirection === 'left') {
      const leftCandidate = [...nearestCandidates].sort((a, b) => a.x - b.x)[0];
      return leftCandidate ?? fallback;
    }

    const randomIndex = params.rng.int(Math.max(1, nearestCandidates.length));
    return nearestCandidates[randomIndex] ?? fallback;
  }

  moveGhostInJail(
    ghost: GhostEntity,
    bounds: { minX: number; maxX: number; y: number },
    movementRules: MovementRules,
    rng: RandomSource,
    jailMoveSpeed: number,
  ): void {
    if (ghost.tile.y !== bounds.y || ghost.moved.y !== 0) {
      movementRules.setEntityTile(ghost, { x: ghost.tile.x, y: bounds.y });
    }

    if (ghost.moved.x === 0) {
      if (ghost.direction !== 'left' && ghost.direction !== 'right') {
        ghost.direction = rng.next() < 0.5 ? 'right' : 'left';
      }

      if (ghost.tile.x <= bounds.minX && ghost.direction === 'left') {
        ghost.direction = 'right';
      } else if (ghost.tile.x >= bounds.maxX && ghost.direction === 'right') {
        ghost.direction = 'left';
      }
    }

    movementRules.advanceEntity(ghost, ghost.direction, jailMoveSpeed);

    if (ghost.tile.x < bounds.minX || ghost.tile.x > bounds.maxX) {
      const clampedX = clamp(ghost.tile.x, bounds.minX, bounds.maxX);
      movementRules.setEntityTile(ghost, { x: clampedX, y: bounds.y });
      ghost.direction = ghost.direction === 'left' ? 'right' : 'left';
    }
  }

  private canGhostMoveFromTile(tile: TilePosition, collisionGrid: CollisionGrid, movementRules: MovementRules): boolean {
    const collisionTiles = collisionGrid.getTilesAt(tile);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    return directions.some((direction) => movementRules.canMove(direction, 0, 0, collisionTiles, 'ghost'));
  }

  private clampTilePosition(tile: TilePosition, map: WorldMapData): TilePosition {
    return {
      x: clamp(tile.x, 0, map.width - 1),
      y: clamp(tile.y, 0, map.height - 1),
    };
  }
}
