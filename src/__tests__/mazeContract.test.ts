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
});
