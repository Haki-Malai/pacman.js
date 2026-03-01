import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTiledMap } from '../game/infrastructure/map/TiledParser';

type TiledProperty = {
  name: string;
  type: string;
  value: unknown;
};

type TiledObject = {
  id?: number;
  name?: string;
  type: string;
  x?: number;
  y?: number;
  properties?: TiledProperty[];
};

type TiledMap = {
  layers: Array<{
    name: string;
    type: string;
    objects?: TiledObject[];
  }>;
};

const DEMO_JSON_PATH = path.resolve(process.cwd(), 'public/assets/mazes/default/demo.json');

function readMap(): TiledMap {
  return JSON.parse(fs.readFileSync(DEMO_JSON_PATH, 'utf8')) as TiledMap;
}

function getPropertyValue(properties: TiledProperty[] | undefined, name: string): unknown {
  return properties?.find((property) => property.name === name)?.value;
}

describe('demo.json contract', () => {
  it('parses successfully with the tiled parser', () => {
    const parsed = parseTiledMap(readMap());

    expect(parsed.width).toBeGreaterThan(0);
    expect(parsed.height).toBeGreaterThan(0);
    expect(parsed.tiles.length).toBe(parsed.height);
  });

  it('resolves known image paths for all non-empty tiles', () => {
    const parsed = parseTiledMap(readMap());
    const nonEmptyTiles = parsed.tiles.flat().filter((tile) => tile.gid !== null);

    expect(nonEmptyTiles.length).toBeGreaterThan(0);
    nonEmptyTiles.forEach((tile) => {
      expect(tile.imagePath).not.toBe('(unknown)');
      expect(tile.imagePath.startsWith('source/tiles/')).toBe(true);
    });
  });

  it('contains normalized spawn contract for pacman and ghost-home', () => {
    const map = readMap();
    const spawnLayer = map.layers.find((layer) => layer.name === 'Spawns' && layer.type === 'objectgroup');
    const objects = spawnLayer?.objects ?? [];

    const pacmanSpawn = objects.find((object) => object.type === 'pacman');
    const ghostHome = objects.find((object) => object.type === 'ghost-home');

    expect(getPropertyValue(pacmanSpawn?.properties, 'gridX')).toBe(25);
    expect(getPropertyValue(pacmanSpawn?.properties, 'gridY')).toBe(26);
    expect(getPropertyValue(ghostHome?.properties, 'ghostCount')).toBe(4);
    expect(getPropertyValue(ghostHome?.properties, 'startX')).toBe(22);
    expect(getPropertyValue(ghostHome?.properties, 'endX')).toBe(28);
    expect(getPropertyValue(ghostHome?.properties, 'gridY')).toBe(27);
  });

  it('contains deterministic portal pairs from normalized spawn objects', () => {
    const map = readMap();
    const spawnLayer = map.layers.find((layer) => layer.name === 'Spawns' && layer.type === 'objectgroup');
    const objects = spawnLayer?.objects ?? [];

    const leftPortal = objects.find((object) => object.name === 'portal-left' && object.type === 'portal');
    const rightPortal = objects.find((object) => object.name === 'portal-right' && object.type === 'portal');
    const topPortal = objects.find((object) => object.name === 'portal-top' && object.type === 'portal');
    const bottomPortal = objects.find((object) => object.name === 'portal-bottom' && object.type === 'portal');

    expect(getPropertyValue(leftPortal?.properties, 'pairId')).toBe('horizontal');
    expect(getPropertyValue(rightPortal?.properties, 'pairId')).toBe('horizontal');
    expect(getPropertyValue(topPortal?.properties, 'pairId')).toBe('vertical');
    expect(getPropertyValue(bottomPortal?.properties, 'pairId')).toBe('vertical');

    const parsed = parseTiledMap(map);
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
});
