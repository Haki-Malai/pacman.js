import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GhostJailService } from '../game/domain/services/GhostJailService';
import { parseTiledMap, TiledMap } from '../game/infrastructure/map/TiledParser';
import { PortalPair } from '../game/domain/world/WorldState';

const DEMO_JSON_PATH = path.resolve(process.cwd(), 'public/assets/mazes/default/demo.json');

function readMap(): TiledMap {
  return JSON.parse(fs.readFileSync(DEMO_JSON_PATH, 'utf8')) as TiledMap;
}

function hasPair(pairs: PortalPair[] | undefined, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return (pairs ?? []).some((pair) => {
    const direct = pair.from.x === a.x && pair.from.y === a.y && pair.to.x === b.x && pair.to.y === b.y;
    const reverse = pair.from.x === b.x && pair.from.y === b.y && pair.to.x === a.x && pair.to.y === a.y;
    return direct || reverse;
  });
}

describe('demo.json contract', () => {
  it('parses successfully with the tiled parser', () => {
    const parsed = parseTiledMap(readMap());

    expect(parsed.width).toBeGreaterThan(0);
    expect(parsed.height).toBeGreaterThan(0);
    expect(parsed.tiles.length).toBe(parsed.height);
    expect(parsed.tiles[0]?.length).toBe(parsed.width);
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

  it('keeps parsed map bounds trimmed to playable tile envelope', () => {
    const parsed = parseTiledMap(readMap());

    const topHasNonEmpty = parsed.tiles[0]?.some((tile) => tile.gid !== null);
    const bottomHasNonEmpty = parsed.tiles[parsed.height - 1]?.some((tile) => tile.gid !== null);
    const leftHasNonEmpty = parsed.tiles.some((row) => row[0]?.gid !== null);
    const rightHasNonEmpty = parsed.tiles.some((row) => row[parsed.width - 1]?.gid !== null);

    expect(topHasNonEmpty).toBe(true);
    expect(bottomHasNonEmpty).toBe(true);
    expect(leftHasNonEmpty).toBe(true);
    expect(rightHasNonEmpty).toBe(true);
  });

  it('infers deterministic geometry-driven portal pairs on boundary doors', () => {
    const first = parseTiledMap(readMap());
    const second = parseTiledMap(readMap());

    expect(first.portalPairs).toEqual(second.portalPairs);

    (first.portalPairs ?? []).forEach((pair) => {
      const from = first.tiles[pair.from.y]?.[pair.from.x];
      const to = first.tiles[pair.to.y]?.[pair.to.x];

      expect(from?.collision.portal).toBe(true);
      expect(to?.collision.portal).toBe(true);
      expect(pair.from.x === pair.to.x || pair.from.y === pair.to.y).toBe(true);
    });

    expect(hasPair(first.portalPairs, { x: 1, y: 7 }, { x: 11, y: 7 })).toBe(true);
    expect(hasPair(first.portalPairs, { x: 6, y: 1 }, { x: 6, y: 11 })).toBe(true);
  });

  it('infers pacman and jail anchors when spawn objects are missing', () => {
    const parsed = parseTiledMap(readMap());
    const jailService = new GhostJailService();
    const fallback = {
      x: Math.floor(parsed.width / 2),
      y: Math.floor(parsed.height / 2),
    };

    expect(parsed.pacmanSpawn).toBeUndefined();
    expect(parsed.ghostHome).toBeUndefined();

    const pacmanTile = jailService.resolveSpawnTile(parsed.pacmanSpawn, fallback, parsed);
    const jailBounds = jailService.resolveGhostJailBounds(parsed, pacmanTile);

    expect(jailBounds).toEqual({ minX: 4, maxX: 8, y: 8 });
    expect(pacmanTile).toEqual({ x: 6, y: 7 });
  });
});
