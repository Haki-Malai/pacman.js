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
    expect(getPropertyValue(leftPortal?.properties, 'pairId')).toBe('horizontal');
    expect(getPropertyValue(rightPortal?.properties, 'pairId')).toBe('horizontal');
    expect(getPropertyValue(topPortal?.properties, 'pairId')).toBe('vertical');
    expect(getPropertyValue(bottomPortal?.properties, 'pairId')).toBe('vertical');
  });

  it('parses deterministic geometry-driven portal endpoint pairs', () => {
    const first = parseTiledMap(readMap());
    const second = parseTiledMap(readMap());
    const parsed = first;
    const portalTiles: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < parsed.height; y += 1) {
      for (let x = 0; x < parsed.width; x += 1) {
        if (parsed.tiles[y]?.[x]?.collision.portal) {
          portalTiles.push({ x, y });
        }
      }
    }

    expect(first.portalPairs).toEqual(second.portalPairs);
    expect(parsed.portalPairs?.length).toBeGreaterThanOrEqual(1);
    expect(portalTiles.length).toBe((parsed.portalPairs?.length ?? 0) * 2);

    (parsed.portalPairs ?? []).forEach((pair) => {
      const from = parsed.tiles[pair.from.y]?.[pair.from.x];
      const to = parsed.tiles[pair.to.y]?.[pair.to.x];

      expect(from?.collision.portal).toBe(true);
      expect(to?.collision.portal).toBe(true);
      expect(from?.collision.collides).toBe(false);
      expect(to?.collision.collides).toBe(false);
      expect(pair.from.x === pair.to.x || pair.from.y === pair.to.y).toBe(true);

      if (pair.from.y === pair.to.y) {
        const fromNearOuter = pair.from.x <= 1 || pair.from.x >= parsed.width - 2;
        const toNearOuter = pair.to.x <= 1 || pair.to.x >= parsed.width - 2;
        expect(fromNearOuter).toBe(true);
        expect(toNearOuter).toBe(true);
        return;
      }

      const fromNearOuter = pair.from.y <= 1 || pair.from.y >= parsed.height - 2;
      const toNearOuter = pair.to.y <= 1 || pair.to.y >= parsed.height - 2;
      expect(fromNearOuter).toBe(true);
      expect(toNearOuter).toBe(true);
    });
  });

  it('keeps non-portal boundary-facing tiles hardened against void leak', () => {
    const parsed = parseTiledMap(readMap());
    const hasLeakToVoid = (): boolean => {
      for (let y = 0; y < parsed.height; y += 1) {
        for (let x = 0; x < parsed.width; x += 1) {
          const tile = parsed.tiles[y]?.[x];
          if (!tile || tile.gid === null || tile.collision.portal) {
            continue;
          }

          const neighbors = [
            { dx: 0, dy: -1, blocked: tile.collision.up },
            { dx: 1, dy: 0, blocked: tile.collision.right },
            { dx: 0, dy: 1, blocked: tile.collision.down },
            { dx: -1, dy: 0, blocked: tile.collision.left },
          ];

          const leaks = neighbors.some(({ dx, dy, blocked }) => {
            const neighbor = parsed.tiles[y + dy]?.[x + dx];
            const isVoid = !neighbor || neighbor.gid === null;
            return isVoid && !blocked;
          });

          if (leaks) {
            return true;
          }
        }
      }
      return false;
    };

    expect(hasLeakToVoid()).toBe(false);
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
