import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
  name: string;
  type: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: Array<{
    type: string;
    properties?: TiledProperty[];
  }>;
};

type TiledMap = {
  layers: TiledLayer[];
  tilesets: Array<{
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
  17: { collides: false, up: false, down: false, left: false, right: false },
  18: { collides: false, up: false, down: false, left: false, right: false },
  19: { collides: false, up: false, down: false, left: false, right: false },
  20: { collides: false, up: false, down: false, left: false, right: false },
  21: { collides: false, up: false, down: false, left: false, right: false },
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
    expect(getPropertyValue(ghostHome?.properties, 'ghostCount')).toBe(4);
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
