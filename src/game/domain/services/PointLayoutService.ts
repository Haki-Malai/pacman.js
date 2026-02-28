import { SeededRandom } from '../../shared/random/SeededRandom';
import { DIRECTION_VECTORS, DIRECTIONS } from '../valueObjects/Direction';
import { TilePosition } from '../valueObjects/TilePosition';
import { canMove } from './MovementRules';
import { CollisionGrid } from '../world/CollisionGrid';
import { WorldMapData } from '../world/WorldState';

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const DEFAULT_POWER_POINT_RATIO = 1 / 13;

export interface PointLayout {
  basePoints: TilePosition[];
  powerPoints: TilePosition[];
  seed: number;
}

export interface PointLayoutOptions {
  powerPointRatio?: number;
  minPowerPoints?: number;
  maxPowerPoints?: number;
  seed?: number;
}

export interface BuildPointLayoutParams {
  map: WorldMapData;
  collisionGrid: CollisionGrid;
  startTile: TilePosition;
  tileSize: number;
  options?: PointLayoutOptions;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function toTileKey(tile: TilePosition): string {
  return `${tile.x},${tile.y}`;
}

function compareTiles(a: TilePosition, b: TilePosition): number {
  if (a.y !== b.y) {
    return a.y - b.y;
  }
  return a.x - b.x;
}

function isWithinBounds(map: WorldMapData, tile: TilePosition): boolean {
  return tile.x >= 0 && tile.x < map.width && tile.y >= 0 && tile.y < map.height;
}

function isMapVoidTile(map: WorldMapData, tile: TilePosition): boolean {
  if (!isWithinBounds(map, tile)) {
    return false;
  }

  const mapTile = map.tiles[tile.y]?.[tile.x];
  return !mapTile || mapTile.gid === null;
}

function hasNavigableVoidBoundaryEdge(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: TilePosition,
  tileSize: number,
): boolean {
  if (!isTraversalPlayableTile(map, tile)) {
    return false;
  }

  const collisionTiles = collisionGrid.getTilesAt(tile);

  return DIRECTIONS.some((direction) => {
    const delta = DIRECTION_VECTORS[direction];
    const neighbor = { x: tile.x + delta.dx, y: tile.y + delta.dy };

    if (!isMapVoidTile(map, neighbor)) {
      return false;
    }

    return canMove(direction, 0, 0, collisionTiles, tileSize, 'pacman');
  });
}

function isTraversalPlayableTile(map: WorldMapData, tile: TilePosition): boolean {
  if (!isWithinBounds(map, tile)) {
    return false;
  }

  const mapTile = map.tiles[tile.y]?.[tile.x];
  return Boolean(mapTile && mapTile.gid !== null && !mapTile.collision.penGate);
}

function isPointPlayableTile(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: TilePosition,
  tileSize: number,
): boolean {
  if (!isTraversalPlayableTile(map, tile)) {
    return false;
  }

  return !hasNavigableVoidBoundaryEdge(map, collisionGrid, tile, tileSize);
}

function getNavigablePlayableNeighbors(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: TilePosition,
  tileSize: number,
): TilePosition[] {
  if (!isTraversalPlayableTile(map, tile)) {
    return [];
  }

  const collisionTiles = collisionGrid.getTilesAt(tile);
  const neighbors: TilePosition[] = [];

  DIRECTIONS.forEach((direction) => {
    const delta = DIRECTION_VECTORS[direction];
    const candidate = { x: tile.x + delta.dx, y: tile.y + delta.dy };

    if (!isTraversalPlayableTile(map, candidate)) {
      return;
    }

    if (!canMove(direction, 0, 0, collisionTiles, tileSize, 'pacman')) {
      return;
    }

    neighbors.push(candidate);
  });

  return neighbors;
}

function isPointSpawnableTile(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: TilePosition,
  tileSize: number,
): boolean {
  return getNavigablePlayableNeighbors(map, collisionGrid, tile, tileSize).length > 0;
}

function resolveTraversalStartTile(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  preferredStart: TilePosition,
  tileSize: number,
): TilePosition | null {
  if (isPointSpawnableTile(map, collisionGrid, preferredStart, tileSize)) {
    return preferredStart;
  }

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const candidate = { x, y };
      if (isPointSpawnableTile(map, collisionGrid, candidate, tileSize)) {
        return candidate;
      }
    }
  }

  return null;
}

function collectReachableTiles(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  startTile: TilePosition,
  tileSize: number,
): TilePosition[] {
  const queue: TilePosition[] = [startTile];
  const visited = new Set<string>();
  const reachable: TilePosition[] = [];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const key = toTileKey(current);

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    const neighbors = getNavigablePlayableNeighbors(map, collisionGrid, current, tileSize);
    if (!neighbors.length) {
      continue;
    }

    reachable.push(current);
    neighbors.forEach((neighbor) => {
      queue.push(neighbor);
    });
  }

  reachable.sort(compareTiles);
  return reachable;
}

function fnv1aMix(hash: number, value: number): number {
  const mixed = (hash ^ (value >>> 0)) >>> 0;
  return Math.imul(mixed, FNV_PRIME) >>> 0;
}

function computeMapBuildSeed(map: WorldMapData, startTile: TilePosition): number {
  let hash = FNV_OFFSET_BASIS;
  hash = fnv1aMix(hash, map.width);
  hash = fnv1aMix(hash, map.height);
  hash = fnv1aMix(hash, startTile.x);
  hash = fnv1aMix(hash, startTile.y);

  map.tiles.forEach((row) => {
    row.forEach((tile) => {
      hash = fnv1aMix(hash, tile.rawGid);
    });
  });

  return hash >>> 0;
}

function pickPowerPoints(basePoints: TilePosition[], count: number, seed: number): TilePosition[] {
  if (count <= 0 || basePoints.length === 0) {
    return [];
  }

  const shuffled = [...basePoints];
  const random = new SeededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const swapIndex = random.int(i + 1);
    [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
  }

  return shuffled.slice(0, count).sort(compareTiles);
}

export function buildPointLayout(params: BuildPointLayoutParams): PointLayout {
  const { map, collisionGrid, startTile, tileSize, options } = params;

  const traversalStart = resolveTraversalStartTile(map, collisionGrid, startTile, tileSize);
  if (!traversalStart) {
    return {
      basePoints: [],
      powerPoints: [],
      seed: 0,
    };
  }

  const reachableTiles = collectReachableTiles(map, collisionGrid, traversalStart, tileSize);
  const basePoints = reachableTiles.filter((tile) => isPointPlayableTile(map, collisionGrid, tile, tileSize));
  const ratio = Math.max(0, options?.powerPointRatio ?? DEFAULT_POWER_POINT_RATIO);

  const maxPowerPoints = Math.min(basePoints.length, Math.max(0, options?.maxPowerPoints ?? basePoints.length));
  const minPowerPoints = Math.min(maxPowerPoints, Math.max(0, options?.minPowerPoints ?? 1));
  const requestedPowerPoints = Math.round(basePoints.length * ratio);
  const powerPointCount = clamp(requestedPowerPoints, minPowerPoints, maxPowerPoints);

  const seed = (options?.seed ?? computeMapBuildSeed(map, traversalStart)) >>> 0;
  const powerPoints = pickPowerPoints(basePoints, powerPointCount, seed);

  return {
    basePoints,
    powerPoints,
    seed,
  };
}
