import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTiledMap } from '../game/infrastructure/map/TiledParser';

type TiledProperty = {
  name: string;
  type: string;
  value: unknown;
};

type TiledTile = {
  id: number;
  properties?: TiledProperty[];
};

type TiledLayer = {
  id?: number;
  name: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  data?: number[];
  objects?: Array<{
    id?: number;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    type: string;
    properties?: TiledProperty[];
  }>;
};

type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: Array<{
    firstgid: number;
    name: string;
    tilewidth: number;
    tileheight: number;
    tiles?: TiledTile[];
  }>;
};

const MAZE_JSON_PATH = path.resolve(process.cwd(), 'public/assets/mazes/default/maze.json');

const COLLISION_RULES: Record<number, { collides: boolean; up: boolean; down: boolean; left: boolean; right: boolean }> = {
  0: { collides: true, up: false, down: false, left: true, right: false },
  1: { collides: true, up: false, down: false, left: true, right: true },
  2: { collides: true, up: true, down: false, left: true, right: false },
  5: { collides: true, up: true, down: false, left: false, right: false },
  6: { collides: true, up: true, down: false, left: false, right: false },
  7: { collides: true, up: false, down: false, left: false, right: true },
  10: { collides: true, up: false, down: true, left: false, right: true },
  14: { collides: false, up: false, down: false, left: false, right: false },
  15: { collides: false, up: false, down: false, left: false, right: false },
  16: { collides: true, up: true, down: true, left: true, right: true },
  17: { collides: true, up: true, down: true, left: true, right: true },
  18: { collides: true, up: true, down: true, left: true, right: true },
  19: { collides: true, up: true, down: true, left: true, right: true },
  20: { collides: true, up: true, down: true, left: true, right: true },
  21: { collides: true, up: true, down: true, left: true, right: true },
  23: { collides: false, up: false, down: false, left: false, right: false },
};

function readMap(): TiledMap {
  return JSON.parse(fs.readFileSync(MAZE_JSON_PATH, 'utf8')) as TiledMap;
}

function readMapText(): string {
  return fs.readFileSync(MAZE_JSON_PATH, 'utf8');
}

function getPropertyValue(properties: TiledProperty[] | undefined, name: string): unknown {
  return properties?.find((property) => property.name === name)?.value;
}

describe('maze.json contract', () => {
  it('contains Maze tile layer and Spawns object layer', () => {
    const map = readMap();
    const mazeLayer = map.layers.find((layer) => layer.name === 'Maze');
    const spawnLayer = map.layers.find((layer) => layer.name === 'Spawns');

    expect(mazeLayer?.type).toBe('tilelayer');
    expect(spawnLayer?.type).toBe('objectgroup');
  });

  it('contains pacman and ghost-home spawn objects with required numeric properties', () => {
    const map = readMap();
    const spawnLayer = map.layers.find((layer) => layer.name === 'Spawns');

    expect(spawnLayer?.type).toBe('objectgroup');
    const objects = spawnLayer?.objects ?? [];
    const pacmanSpawn = objects.find((object) => object.type === 'pacman');
    const ghostHome = objects.find((object) => object.type === 'ghost-home');

    expect(typeof getPropertyValue(pacmanSpawn?.properties, 'gridX')).toBe('number');
    expect(typeof getPropertyValue(pacmanSpawn?.properties, 'gridY')).toBe('number');
    expect(typeof getPropertyValue(ghostHome?.properties, 'startX')).toBe('number');
    expect(typeof getPropertyValue(ghostHome?.properties, 'endX')).toBe('number');
    expect(typeof getPropertyValue(ghostHome?.properties, 'gridY')).toBe('number');
    expect(getPropertyValue(ghostHome?.properties, 'ghostCount')).toBe(4);
  });

  it('contains portal spawn objects that define production teleport anchors', () => {
    const map = readMap();
    const spawnLayer = map.layers.find((layer) => layer.name === 'Spawns');
    const objects = spawnLayer?.objects ?? [];

    const leftPortal = objects.find((object) => object.name === 'portal-left' && object.type === 'portal');
    const rightPortal = objects.find((object) => object.name === 'portal-right' && object.type === 'portal');
    const topPortal = objects.find((object) => object.name === 'portal-top' && object.type === 'portal');
    const bottomPortal = objects.find((object) => object.name === 'portal-bottom' && object.type === 'portal');

    expect(leftPortal).toBeDefined();
    expect(rightPortal).toBeDefined();
    expect(topPortal).toBeDefined();
    expect(bottomPortal).toBeDefined();
    expect(leftPortal?.x).toBe(8);
    expect(leftPortal?.y).toBe(408);
    expect(getPropertyValue(leftPortal?.properties, 'pairId')).toBe('horizontal');
    expect(rightPortal?.x).toBe(808);
    expect(rightPortal?.y).toBe(408);
    expect(getPropertyValue(rightPortal?.properties, 'pairId')).toBe('horizontal');
    expect(topPortal?.x).toBe(408);
    expect(topPortal?.y).toBe(8);
    expect(getPropertyValue(topPortal?.properties, 'pairId')).toBe('vertical');
    expect(bottomPortal?.x).toBe(408);
    expect(bottomPortal?.y).toBe(808);
    expect(getPropertyValue(bottomPortal?.properties, 'pairId')).toBe('vertical');
  });

  it('parses deterministic portal endpoint tiles from portal spawn objects', () => {
    const parsed = parseTiledMap(readMap());
    const portalTiles: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < parsed.height; y += 1) {
      for (let x = 0; x < parsed.width; x += 1) {
        if (parsed.tiles[y]?.[x]?.collision.portal) {
          portalTiles.push({ x, y });
        }
      }
    }

    expect(portalTiles).toEqual([
      { x: 25, y: 1 },
      { x: 1, y: 26 },
      { x: 49, y: 26 },
      { x: 25, y: 49 },
    ]);

    expect(parsed.portalPairs).toEqual([
      {
        from: { x: 1, y: 26 },
        to: { x: 49, y: 26 },
      },
      {
        from: { x: 25, y: 1 },
        to: { x: 25, y: 49 },
      },
    ]);
  });

  it('parses boundary void cells as blocking tiles', () => {
    const parsed = parseTiledMap(readMap());
    const leftVoid = parsed.tiles[26]?.[0]?.collision;
    const rightVoid = parsed.tiles[26]?.[50]?.collision;

    expect(leftVoid).toMatchObject({
      collides: true,
      penGate: false,
      portal: false,
      up: true,
      down: true,
      left: true,
      right: true,
    });
    expect(rightVoid).toMatchObject({
      collides: true,
      penGate: false,
      portal: false,
      up: true,
      down: true,
      left: true,
      right: true,
    });
  });

  it('blocks non-portal tiles that expose an open edge directly into map void', () => {
    const parsed = parseTiledMap(readMap());
    const leakBandTile = parsed.tiles[1]?.[24]?.collision;

    expect(leakBandTile).toMatchObject({
      collides: true,
      penGate: false,
      portal: false,
      up: true,
      right: true,
      down: true,
      left: true,
    });

    const portalEndpoint = parsed.tiles[26]?.[49]?.collision;
    expect(portalEndpoint?.portal).toBe(true);
    expect(portalEndpoint?.collides).toBe(false);
    expect(parsed.tiles[1]?.[25]?.collision.portal).toBe(true);
  });

  it('contains seeded tile collision properties for the migration rules', () => {
    const map = readMap();
    const tiles = map.tilesets[0]?.tiles ?? [];

    Object.entries(COLLISION_RULES).forEach(([tileIdText, rule]) => {
      const tileId = Number(tileIdText);
      const tile = tiles.find((entry) => entry.id === tileId);
      expect(tile).toBeDefined();

      expect(getPropertyValue(tile?.properties, 'collides')).toBe(rule.collides);
      expect(getPropertyValue(tile?.properties, 'up')).toBe(rule.up);
      expect(getPropertyValue(tile?.properties, 'down')).toBe(rule.down);
      expect(getPropertyValue(tile?.properties, 'left')).toBe(rule.left);
      expect(getPropertyValue(tile?.properties, 'right')).toBe(rule.right);
      expect(getPropertyValue(tile?.properties, 'penGate')).toBe(false);
      expect(getPropertyValue(tile?.properties, 'portal')).toBe(false);
    });
  });

  it('keeps Maze data formatted as one map row per line', () => {
    const map = readMap();
    const text = readMapText();
    const mazeLayer = map.layers.find((layer) => layer.name === 'Maze');

    expect(mazeLayer).toBeDefined();
    const width = mazeLayer?.width;
    const height = mazeLayer?.height;
    expect(typeof width).toBe('number');
    expect(typeof height).toBe('number');

    const dataBlockMatch = text.match(/"data": \[\n([\s\S]*?)\n\s{6}\],\n\s{6}"height":/);
    expect(dataBlockMatch).toBeTruthy();
    const rows = (dataBlockMatch?.[1] ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(rows.length).toBe(height);

    rows.forEach((row, index) => {
      const hasTrailingComma = row.endsWith(',');
      if (index < rows.length - 1) {
        expect(hasTrailingComma).toBe(true);
      } else {
        expect(hasTrailingComma).toBe(false);
      }

      const normalized = hasTrailingComma ? row.slice(0, -1) : row;
      const values = normalized
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      expect(values.length).toBe(width);
      values.forEach((value) => {
        expect(/^\d+$/.test(value)).toBe(true);
      });
    });
  });
});
