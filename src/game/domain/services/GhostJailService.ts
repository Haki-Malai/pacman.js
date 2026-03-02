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

interface InferredJailAnchor {
  minX: number;
  maxX: number;
  homeY: number;
  centerX: number;
}

interface HorizontalRun {
  minX: number;
  maxX: number;
  y: number;
  length: number;
  centerX: number;
  localId: number;
}

function countLocalIdFrequency(map: WorldMapData): Map<number, number> {
  const counts = new Map<number, number>();
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const localId = map.tiles[y]?.[x]?.localId;
      if (typeof localId !== 'number') {
        continue;
      }
      counts.set(localId, (counts.get(localId) ?? 0) + 1);
    }
  }
  return counts;
}

function collectPenGateRuns(map: WorldMapData): Array<{ minX: number; maxX: number; y: number; length: number; centerX: number }> {
  const runs: Array<{ minX: number; maxX: number; y: number; length: number; centerX: number }> = [];
  for (let y = 0; y < map.height; y += 1) {
    let x = 0;
    while (x < map.width) {
      if (!map.tiles[y]?.[x]?.collision.penGate) {
        x += 1;
        continue;
      }
      const minX = x;
      while (x < map.width && map.tiles[y]?.[x]?.collision.penGate) {
        x += 1;
      }
      const maxX = x - 1;
      const length = maxX - minX + 1;
      if (length >= 3) {
        runs.push({
          minX,
          maxX,
          y,
          length,
          centerX: minX + Math.floor((maxX - minX) / 2),
        });
      }
    }
  }
  return runs;
}

function collectStructuralRuns(map: WorldMapData): HorizontalRun[] {
  const runs: HorizontalRun[] = [];
  if (map.width < 3 || map.height < 3) {
    return runs;
  }

  for (let y = 1; y < map.height - 1; y += 1) {
    let x = 1;
    while (x < map.width - 1) {
      const localId = map.tiles[y]?.[x]?.localId;
      if (typeof localId !== 'number') {
        x += 1;
        continue;
      }

      const minX = x;
      x += 1;
      while (x < map.width - 1 && map.tiles[y]?.[x]?.localId === localId) {
        x += 1;
      }

      const maxX = x - 1;
      const length = maxX - minX + 1;
      if (length >= 3) {
        runs.push({
          minX,
          maxX,
          y,
          length,
          centerX: minX + Math.floor((maxX - minX) / 2),
          localId,
        });
      }
    }
  }

  return runs;
}

function inferPenGateAnchor(map: WorldMapData): InferredJailAnchor | null {
  const runs = collectPenGateRuns(map);
  if (runs.length === 0) {
    return null;
  }

  const centerX = (map.width - 1) / 2;
  runs.sort((a, b) => {
    const lengthDiff = b.length - a.length;
    if (lengthDiff !== 0) {
      return lengthDiff;
    }
    const centerDistanceDiff = Math.abs(a.centerX - centerX) - Math.abs(b.centerX - centerX);
    if (centerDistanceDiff !== 0) {
      return centerDistanceDiff;
    }
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.minX - b.minX;
  });

  const best = runs[0];
  if (!best) {
    return null;
  }

  const homeY = clamp(best.y + 1, 0, map.height - 1);
  return {
    minX: best.minX,
    maxX: best.maxX,
    homeY,
    centerX: best.centerX,
  };
}

function inferStructuralAnchor(map: WorldMapData): InferredJailAnchor | null {
  const runs = collectStructuralRuns(map);
  if (runs.length === 0) {
    return null;
  }

  const localIdFrequency = countLocalIdFrequency(map);
  const centerX = (map.width - 1) / 2;
  const centerY = (map.height - 1) / 2;
  const lowerTargetY = Math.floor((map.height - 1) * 0.66);

  runs.sort((a, b) => {
    const lowerHalfDiff = (a.y >= centerY ? 0 : 1) - (b.y >= centerY ? 0 : 1);
    if (lowerHalfDiff !== 0) {
      return lowerHalfDiff;
    }

    const centerDistanceDiff = Math.abs(a.centerX - centerX) - Math.abs(b.centerX - centerX);
    if (centerDistanceDiff !== 0) {
      return centerDistanceDiff;
    }

    const rarityDiff = (localIdFrequency.get(a.localId) ?? Number.MAX_SAFE_INTEGER) -
      (localIdFrequency.get(b.localId) ?? Number.MAX_SAFE_INTEGER);
    if (rarityDiff !== 0) {
      return rarityDiff;
    }

    const lengthDiff = b.length - a.length;
    if (lengthDiff !== 0) {
      return lengthDiff;
    }

    const verticalDiff = Math.abs(a.y - lowerTargetY) - Math.abs(b.y - lowerTargetY);
    if (verticalDiff !== 0) {
      return verticalDiff;
    }

    if (a.y !== b.y) {
      return a.y - b.y;
    }

    return a.minX - b.minX;
  });

  const best = runs[0];
  if (!best) {
    return null;
  }

  return {
    minX: best.minX,
    maxX: best.maxX,
    homeY: best.y,
    centerX: best.centerX,
  };
}

function inferPacmanMarkerRow(map: WorldMapData, jailY: number): number | undefined {
  const candidates: Array<{ y: number; length: number; centerX: number; minX: number }> = [];
  const maxSearchY = Math.min(Math.max(jailY - 1, 0), map.height - 2);
  const centerX = (map.width - 1) / 2;

  for (let y = 1; y <= maxSearchY; y += 1) {
    let x = 1;
    while (x < map.width - 1) {
      const first = map.tiles[y]?.[x]?.localId;
      if (typeof first !== 'number') {
        x += 1;
        continue;
      }

      let lastId = first;
      const minX = x;
      x += 1;
      while (x < map.width - 1) {
        const currentId = map.tiles[y]?.[x]?.localId;
        if (typeof currentId !== 'number' || currentId !== lastId + 1) {
          break;
        }
        lastId = currentId;
        x += 1;
      }

      const maxX = x - 1;
      const length = maxX - minX + 1;
      if (length >= 3) {
        candidates.push({
          y,
          length,
          centerX: minX + Math.floor((maxX - minX) / 2),
          minX,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((a, b) => {
    const centerDistanceDiff = Math.abs(a.centerX - centerX) - Math.abs(b.centerX - centerX);
    if (centerDistanceDiff !== 0) {
      return centerDistanceDiff;
    }

    const nearJailDiff = (jailY - a.y) - (jailY - b.y);
    if (nearJailDiff !== 0) {
      return nearJailDiff;
    }

    const lengthDiff = b.length - a.length;
    if (lengthDiff !== 0) {
      return lengthDiff;
    }

    if (a.y !== b.y) {
      return b.y - a.y;
    }

    return a.minX - b.minX;
  });

  return candidates[0]?.y;
}

function inferJailAnchor(map: WorldMapData): InferredJailAnchor | null {
  const penGateAnchor = inferPenGateAnchor(map);
  if (penGateAnchor) {
    return penGateAnchor;
  }

  const structuralAnchor = inferStructuralAnchor(map);
  if (!structuralAnchor) {
    return null;
  }

  return {
    minX: structuralAnchor.minX,
    maxX: structuralAnchor.maxX,
    homeY: structuralAnchor.homeY,
    centerX: structuralAnchor.centerX,
  };
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

    const inferredAnchor = inferJailAnchor(map);
    if (inferredAnchor) {
      let spawnY = inferredAnchor.homeY - 1;
      const markerY = inferPacmanMarkerRow(map, inferredAnchor.homeY);
      if (typeof markerY === 'number' && spawnY <= markerY) {
        spawnY = Math.min(inferredAnchor.homeY - 1, markerY + 1);
      }

      return this.clampTilePosition(
        {
          x: inferredAnchor.centerX,
          y: spawnY,
        },
        map,
      );
    }

    return this.clampTilePosition(fallback, map);
  }

  resolveGhostJailBounds(map: WorldMapData, fallbackTile: TilePosition): { minX: number; maxX: number; y: number } {
    const inferredAnchor = inferJailAnchor(map);
    const ghostStartXRaw = getObjectNumberProperty(map.ghostHome, 'startX') ?? inferredAnchor?.minX ?? fallbackTile.x;
    const ghostEndXRaw = getObjectNumberProperty(map.ghostHome, 'endX') ?? inferredAnchor?.maxX ?? fallbackTile.x;
    const minX = clamp(Math.round(Math.min(ghostStartXRaw, ghostEndXRaw)), 0, map.width - 1);
    const maxX = clamp(Math.round(Math.max(ghostStartXRaw, ghostEndXRaw)), 0, map.width - 1);

    const ghostGridY = getObjectNumberProperty(map.ghostHome, 'gridY');
    const ghostYRaw =
      typeof ghostGridY === 'number'
        ? ghostGridY
        : map.ghostHome && typeof map.ghostHome.y === 'number'
          ? Math.round(map.ghostHome.y / map.tileHeight)
          : inferredAnchor
            ? inferredAnchor.homeY
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
