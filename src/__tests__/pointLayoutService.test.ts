import { describe, expect, it } from 'vitest';
import { DEFAULT_POWER_POINT_RATIO, buildPointLayout } from '../game/domain/services/PointLayoutService';
import { TilePosition } from '../game/domain/valueObjects/TilePosition';
import { CollisionGrid, CollisionTile, createEmptyCollisionTile } from '../game/domain/world/CollisionGrid';
import { WorldMapData, WorldTile } from '../game/domain/world/WorldState';

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
});
