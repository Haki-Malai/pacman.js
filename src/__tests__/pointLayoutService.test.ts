import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getObjectNumberProperty } from '../game/domain/services/GhostJailService';
import { canMove } from '../game/domain/services/MovementRules';
import { DEFAULT_POWER_POINT_RATIO, buildPointLayout } from '../game/domain/services/PointLayoutService';
import { DIRECTIONS, DIRECTION_VECTORS } from '../game/domain/valueObjects/Direction';
import { TilePosition } from '../game/domain/valueObjects/TilePosition';
import { CollisionGrid, CollisionTile, createEmptyCollisionTile } from '../game/domain/world/CollisionGrid';
import { WorldMapData, WorldTile } from '../game/domain/world/WorldState';
import { TiledMap, parseTiledMap } from '../game/infrastructure/map/TiledParser';

function createCollisionTile(overrides: Partial<CollisionTile> = {}): CollisionTile {
  return {
    ...createEmptyCollisionTile(),
    ...overrides,
  };
}

function createMapFixture(collisionRows: CollisionTile[][], rawGidRows?: number[][]): {
  map: WorldMapData;
  collisionGrid: CollisionGrid;
} {
  const height = collisionRows.length;
  const width = collisionRows[0]?.length ?? 0;

  const tiles: WorldTile[][] = collisionRows.map((row, y) => {
    return row.map((collision, x) => {
      const rawGid = rawGidRows?.[y]?.[x] ?? 1;
      const gid = rawGid > 0 ? rawGid : null;

      return {
        x,
        y,
        rawGid,
        gid,
        localId: gid,
        imagePath: gid === null ? '(empty)' : 'tile.png',
        rotation: 0,
        flipX: false,
        flipY: false,
        collision: { ...collision },
      };
    });
  });

  const collisionByGid = new Map<number, CollisionTile>();
  tiles.forEach((row) => {
    row.forEach((tile) => {
      if (tile.gid === null || collisionByGid.has(tile.gid)) {
        return;
      }
      collisionByGid.set(tile.gid, { ...tile.collision });
    });
  });

  const map: WorldMapData = {
    width,
    height,
    tileWidth: 16,
    tileHeight: 16,
    widthInPixels: width * 16,
    heightInPixels: height * 16,
    tiles,
    collisionByGid,
    imageByGid: new Map(),
    spawnObjects: [],
  };

  const collisionGrid = new CollisionGrid(collisionRows.map((row) => row.map((tile) => ({ ...tile }))));

  return {
    map,
    collisionGrid,
  };
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

function hasCollisionBoundary(collision: CollisionTile): boolean {
  return collision.collides || collision.up || collision.down || collision.left || collision.right || collision.portal;
}

function isMapVoidTile(map: WorldMapData, tile: TilePosition): boolean {
  if (tile.x < 0 || tile.x >= map.width || tile.y < 0 || tile.y >= map.height) {
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
  const collisionTiles = collisionGrid.getTilesAt(tile);

  return DIRECTIONS.some((direction) => {
    const vector = DIRECTION_VECTORS[direction];
    const neighbor = { x: tile.x + vector.dx, y: tile.y + vector.dy };

    if (!isMapVoidTile(map, neighbor)) {
      return false;
    }

    return canMove(direction, 0, 0, collisionTiles, tileSize, 'pacman');
  });
}

function isTraversalCandidateTile(map: WorldMapData, tile: TilePosition): boolean {
  if (tile.x < 0 || tile.x >= map.width || tile.y < 0 || tile.y >= map.height) {
    return false;
  }

  const mapTile = map.tiles[tile.y]?.[tile.x];
  return Boolean(mapTile && mapTile.gid !== null && !mapTile.collision.penGate);
}

function isPointCandidateTile(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: TilePosition,
  tileSize: number,
): boolean {
  if (!isTraversalCandidateTile(map, tile)) {
    return false;
  }

  return !hasNavigableVoidBoundaryEdge(map, collisionGrid, tile, tileSize);
}

function getExpectedNavigableNeighbors(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: TilePosition,
  tileSize: number,
): TilePosition[] {
  if (!isTraversalCandidateTile(map, tile)) {
    return [];
  }

  const collisionTiles = collisionGrid.getTilesAt(tile);
  const neighbors: TilePosition[] = [];

  DIRECTIONS.forEach((direction) => {
    const vector = DIRECTION_VECTORS[direction];
    const candidate = { x: tile.x + vector.dx, y: tile.y + vector.dy };

    if (!isTraversalCandidateTile(map, candidate)) {
      return;
    }

    if (!canMove(direction, 0, 0, collisionTiles, tileSize, 'pacman')) {
      return;
    }

    neighbors.push(candidate);
  });

  return neighbors;
}

function resolveExpectedTraversalStart(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  preferredStart: TilePosition,
  tileSize: number,
): TilePosition | null {
  if (getExpectedNavigableNeighbors(map, collisionGrid, preferredStart, tileSize).length > 0) {
    return preferredStart;
  }

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const candidate = { x, y };
      if (getExpectedNavigableNeighbors(map, collisionGrid, candidate, tileSize).length > 0) {
        return candidate;
      }
    }
  }

  return null;
}

function collectExpectedReachableTiles(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  preferredStart: TilePosition,
  tileSize: number,
): TilePosition[] {
  const start = resolveExpectedTraversalStart(map, collisionGrid, preferredStart, tileSize);
  if (!start) {
    return [];
  }

  const queue: TilePosition[] = [start];
  const visited = new Set<string>();
  const expected: TilePosition[] = [];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const key = toTileKey(current);

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    const neighbors = getExpectedNavigableNeighbors(map, collisionGrid, current, tileSize);
    if (!neighbors.length) {
      continue;
    }

    if (isPointCandidateTile(map, collisionGrid, current, tileSize)) {
      expected.push(current);
    }

    neighbors.forEach((neighbor) => {
      queue.push(neighbor);
    });
  }

  expected.sort(compareTiles);
  return expected;
}

function collectVoidBoundaryForbiddenTiles(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tileSize: number,
): TilePosition[] {
  const forbidden: TilePosition[] = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const candidate = { x, y };
      if (!isTraversalCandidateTile(map, candidate)) {
        continue;
      }

      if (hasNavigableVoidBoundaryEdge(map, collisionGrid, candidate, tileSize)) {
        forbidden.push(candidate);
      }
    }
  }

  forbidden.sort(compareTiles);
  return forbidden;
}

function loadProductionMazeFixture(): {
  map: WorldMapData;
  collisionGrid: CollisionGrid;
  startTile: TilePosition;
} {
  const mazePath = path.resolve(process.cwd(), 'public/assets/mazes/default/maze.json');
  const tiledMap = JSON.parse(fs.readFileSync(mazePath, 'utf8')) as TiledMap;
  const map = parseTiledMap(tiledMap);
  const collisionGrid = new CollisionGrid(map.tiles.map((row) => row.map((tile) => ({ ...tile.collision }))));

  const spawnX = getObjectNumberProperty(map.pacmanSpawn, 'gridX');
  const spawnY = getObjectNumberProperty(map.pacmanSpawn, 'gridY');
  expect(typeof spawnX).toBe('number');
  expect(typeof spawnY).toBe('number');

  return {
    map,
    collisionGrid,
    startTile: { x: spawnX as number, y: spawnY as number },
  };
}

describe('buildPointLayout', () => {
  it('marks navigable colliding tiles as base-point tiles when movement allows it', () => {
    const row = [
      createCollisionTile({ collides: true, left: true }),
      createCollisionTile({ collides: true }),
      createCollisionTile({ collides: true, right: true }),
    ];

    const { map, collisionGrid } = createMapFixture([row]);
    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile: { x: 1, y: 0 },
      tileSize: 16,
      options: { powerPointRatio: 0, minPowerPoints: 0 },
    });

    expect(layout.basePoints).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('includes non-colliding connector tiles and keeps traversal connected through them', () => {
    const row = [
      createCollisionTile({ collides: true, left: true }),
      createCollisionTile(),
      createCollisionTile({ collides: true }),
      createCollisionTile({ collides: true, right: true }),
    ];

    const { map, collisionGrid } = createMapFixture([row]);
    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile: { x: 0, y: 0 },
      tileSize: 16,
      options: { powerPointRatio: 0, minPowerPoints: 0 },
    });

    expect(layout.basePoints).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('only emits base points for tiles reachable from the traversal start', () => {
    const row = [
      createCollisionTile({ left: true }),
      createCollisionTile({ right: true }),
      createCollisionTile({ left: true }),
      createCollisionTile({ right: true }),
    ];

    const { map, collisionGrid } = createMapFixture([row]);
    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile: { x: 0, y: 0 },
      tileSize: 16,
      options: { powerPointRatio: 0, minPowerPoints: 0 },
    });

    expect(layout.basePoints).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });

  it('does not place points on gid-null tiles or on tiles that open directly into a gid-null void tile', () => {
    const collisionRows = [
      [createCollisionTile({ collides: true }), createCollisionTile({ collides: true })],
      [createCollisionTile({ collides: true }), createCollisionTile({ collides: true })],
    ];

    const { map, collisionGrid } = createMapFixture(collisionRows, [
      [1, 1],
      [1, 0],
    ]);

    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile: { x: 0, y: 0 },
      tileSize: 16,
      options: { powerPointRatio: 0, minPowerPoints: 0 },
    });

    expect(layout.basePoints).toEqual([{ x: 0, y: 0 }]);
    expect(layout.basePoints).not.toContainEqual({ x: 1, y: 0 });
    expect(layout.basePoints).not.toContainEqual({ x: 0, y: 1 });
    expect(layout.basePoints).not.toContainEqual({ x: 1, y: 1 });
  });

  it('ignores isolated fallback candidates that are not connected to a playable neighbor tile', () => {
    const row = [
      createCollisionTile({ right: true }),
      createCollisionTile({ left: true }),
      createCollisionTile({ right: true }),
    ];

    const { map, collisionGrid } = createMapFixture([row]);
    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile: { x: 99, y: 99 },
      tileSize: 16,
      options: { powerPointRatio: 0, minPowerPoints: 0 },
    });

    expect(layout.basePoints).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('keeps power-point placement deterministic per map build seed', () => {
    const collisionRows = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => createCollisionTile({ collides: true })),
    );

    const firstFixture = createMapFixture(collisionRows);
    const firstLayout = buildPointLayout({
      map: firstFixture.map,
      collisionGrid: firstFixture.collisionGrid,
      startTile: { x: 0, y: 0 },
      tileSize: 16,
    });

    const secondLayout = buildPointLayout({
      map: firstFixture.map,
      collisionGrid: firstFixture.collisionGrid,
      startTile: { x: 0, y: 0 },
      tileSize: 16,
    });

    expect(firstLayout.basePoints).toHaveLength(100);
    expect(firstLayout.powerPoints).toHaveLength(Math.round(100 * DEFAULT_POWER_POINT_RATIO));
    expect(firstLayout.powerPoints).toEqual(secondLayout.powerPoints);

    const basePointKeys = new Set(firstLayout.basePoints.map((tile) => toTileKey(tile)));
    expect(firstLayout.powerPoints.every((tile) => basePointKeys.has(toTileKey(tile)))).toBe(true);

    const rawGids = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 1));
    rawGids[0][0] = 2;
    const changedFixture = createMapFixture(collisionRows, rawGids);

    const changedLayout = buildPointLayout({
      map: changedFixture.map,
      collisionGrid: changedFixture.collisionGrid,
      startTile: { x: 0, y: 0 },
      tileSize: 16,
    });

    expect(changedLayout.powerPoints).not.toEqual(firstLayout.powerPoints);
  });

  it('matches the production maze reachable movement topology (including non-colliding path connectors)', () => {
    const { map, collisionGrid, startTile } = loadProductionMazeFixture();

    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    const expectedBasePoints = collectExpectedReachableTiles(map, collisionGrid, startTile, map.tileWidth);
    const expectedKeys = expectedBasePoints.map((tile) => toTileKey(tile));
    const actualKeys = layout.basePoints.map((tile) => toTileKey(tile));

    expect(new Set(actualKeys).size).toBe(actualKeys.length);
    expect([...actualKeys].sort()).toEqual([...expectedKeys].sort());

    const includesReachableNonCollidingTile = layout.basePoints.some((tile) => {
      const mapTile = map.tiles[tile.y]?.[tile.x];
      return Boolean(mapTile && !mapTile.collision.collides);
    });

    expect(includesReachableNonCollidingTile).toBe(true);

    layout.basePoints.forEach((tile) => {
      const mapTile = map.tiles[tile.y]?.[tile.x];
      expect(mapTile?.gid).not.toBeNull();
      expect(mapTile?.collision.penGate).toBe(false);
    });
  });

  it('keeps every production-maze point tile within map bounds', () => {
    const { map, collisionGrid, startTile } = loadProductionMazeFixture();

    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    layout.basePoints.forEach((tile) => {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(map.width);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(map.height);
    });

    layout.powerPoints.forEach((tile) => {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(map.width);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(map.height);
    });
  });

  it('keeps production-maze point distribution anchored at known tiles without helper-derived traversal expectations', () => {
    const { map, collisionGrid, startTile } = loadProductionMazeFixture();

    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    const basePointKeys = new Set(layout.basePoints.map((tile) => toTileKey(tile)));

    expect(layout.basePoints.length).toBe(2197);
    expect(layout.powerPoints.length).toBe(169);

    expect(basePointKeys.has('2,2')).toBe(true);
    expect(basePointKeys.has('25,44')).toBe(true);
    expect(basePointKeys.has('39,39')).toBe(true);

    expect(basePointKeys.has('2,1')).toBe(false);
    expect(basePointKeys.has('1,2')).toBe(false);
    expect(basePointKeys.has('48,1')).toBe(false);
  });

  it('excludes production-maze border tiles whose collision topology opens directly into map void', () => {
    const { map, collisionGrid, startTile } = loadProductionMazeFixture();

    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    const forbiddenTiles = collectVoidBoundaryForbiddenTiles(map, collisionGrid, map.tileWidth);
    const forbiddenKeys = new Set(forbiddenTiles.map((tile) => toTileKey(tile)));
    const basePointKeys = new Set(layout.basePoints.map((tile) => toTileKey(tile)));

    expect(forbiddenTiles).toEqual(
      expect.arrayContaining([
        { x: 2, y: 1 },
        { x: 48, y: 1 },
        { x: 1, y: 2 },
        { x: 49, y: 48 },
        { x: 2, y: 49 },
        { x: 48, y: 49 },
      ]),
    );

    const leakedForbiddenPoints = [...forbiddenKeys].filter((key) => basePointKeys.has(key));
    expect(leakedForbiddenPoints).toEqual([]);

    const interiorNonCollidingConnector = layout.basePoints.find((tile) => {
      const mapTile = map.tiles[tile.y]?.[tile.x];
      return Boolean(mapTile && !hasCollisionBoundary(mapTile.collision) && !forbiddenKeys.has(toTileKey(tile)));
    });

    expect(interiorNonCollidingConnector).toBeDefined();
  });

  it('keeps production-maze power points as a deterministic subset of base points', () => {
    const { map, collisionGrid, startTile } = loadProductionMazeFixture();

    const firstLayout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    const secondLayout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    const baseKeys = new Set(firstLayout.basePoints.map((tile) => toTileKey(tile)));
    const powerKeys = firstLayout.powerPoints.map((tile) => toTileKey(tile));

    expect(firstLayout.powerPoints).toEqual(secondLayout.powerPoints);
    expect(new Set(powerKeys).size).toBe(powerKeys.length);
    expect(powerKeys.every((key) => baseKeys.has(key))).toBe(true);
  });
});
