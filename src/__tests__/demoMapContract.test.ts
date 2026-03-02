import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GhostJailService } from '../game/domain/services/GhostJailService';
import { canMove, DEFAULT_TILE_SIZE } from '../game/domain/services/MovementRules';
import { CollisionGrid } from '../game/domain/world/CollisionGrid';
import { parseTiledMap, TiledMap, TiledProperty, TiledTileLayer } from '../game/infrastructure/map/TiledParser';
import { PortalPair } from '../game/domain/world/WorldState';

const DEMO_JSON_PATH = path.resolve(process.cwd(), 'public/assets/mazes/default/demo.json');
const TILESET_TSX_PATH = path.resolve(process.cwd(), 'public/assets/mazes/tileset.tsx');

const FLIPPED_HORIZONTAL = 0x80000000;
const FLIPPED_VERTICAL = 0x40000000;
const FLIPPED_ANTI_DIAGONAL = 0x20000000;
const REQUIRED_COLLISION_PROPERTIES = ['collides', 'up', 'down', 'left', 'right', 'penGate', 'portal'] as const;

type CollisionSignature = Record<(typeof REQUIRED_COLLISION_PROPERTIES)[number], boolean>;

function readMap(): TiledMap {
  return JSON.parse(fs.readFileSync(DEMO_JSON_PATH, 'utf8')) as TiledMap;
}

function toAttributeRecord(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([A-Za-z_][A-Za-z0-9_.:-]*)="([^"]*)"/g;
  let match = regex.exec(raw);
  while (match) {
    attrs[match[1]] = match[2];
    match = regex.exec(raw);
  }
  return attrs;
}

function parseBoolLiteral(value: string, context: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  throw new Error(`${context} is not a valid boolean literal: ${value}`);
}

function parseTsxCanonicalCollision(): Map<number, CollisionSignature> {
  const source = fs.readFileSync(TILESET_TSX_PATH, 'utf8');
  const tileRegex = /<tile\b([^>]*)>([\s\S]*?)<\/tile>/g;
  const result = new Map<number, CollisionSignature>();

  let tileMatch = tileRegex.exec(source);
  while (tileMatch) {
    const tileAttrs = toAttributeRecord(tileMatch[1]);
    const id = Number.parseInt(tileAttrs.id ?? '', 10);
    if (!Number.isFinite(id)) {
      throw new Error(`TSX tile is missing valid id: ${tileMatch[1]}`);
    }

    const tileBody = tileMatch[2];
    const propertiesMatch = tileBody.match(/<properties>([\s\S]*?)<\/properties>/);
    const properties = new Map<string, boolean>();
    if (propertiesMatch) {
      const propertyRegex = /<property\b([^>]*)\/?>/g;
      let propertyMatch = propertyRegex.exec(propertiesMatch[1]);
      while (propertyMatch) {
        const propertyAttrs = toAttributeRecord(propertyMatch[1]);
        const name = propertyAttrs.name;
        const value = propertyAttrs.value;
        if (name && value !== undefined) {
          properties.set(name, parseBoolLiteral(value, `TSX tile ${id} property "${name}"`));
        }
        propertyMatch = propertyRegex.exec(propertiesMatch[1]);
      }
    }

    const missing = REQUIRED_COLLISION_PROPERTIES.filter((name) => !properties.has(name));
    if (missing.length > 0) {
      throw new Error(`TSX tile ${id} is missing required collision properties: ${missing.join(', ')}`);
    }

    result.set(id, {
      collides: properties.get('collides') ?? false,
      up: properties.get('up') ?? false,
      down: properties.get('down') ?? false,
      left: properties.get('left') ?? false,
      right: properties.get('right') ?? false,
      penGate: properties.get('penGate') ?? false,
      portal: properties.get('portal') ?? false,
    });

    tileMatch = tileRegex.exec(source);
  }

  return result;
}

function readCollisionSignature(properties?: TiledProperty[]): CollisionSignature {
  const record: Record<string, unknown> = {};
  (properties ?? []).forEach((property) => {
    record[property.name] = property.value;
  });

  return {
    collides: Boolean(record.collides),
    up: Boolean(record.up),
    down: Boolean(record.down),
    left: Boolean(record.left),
    right: Boolean(record.right),
    penGate: Boolean(record.penGate),
    portal: Boolean(record.portal),
  };
}

function readUsedLocalTileIds(map: TiledMap): number[] {
  const tileLayer = map.layers.find(
    (layer): layer is TiledTileLayer =>
      typeof layer.type === 'string' && layer.type === 'tilelayer' && Array.isArray((layer as TiledTileLayer).data),
  );
  if (!tileLayer) {
    return [];
  }

  const firstGid = map.tilesets[0]?.firstgid ?? 1;
  const used = new Set<number>();
  tileLayer.data.forEach((rawGid: number) => {
    const gid = rawGid & ~(FLIPPED_HORIZONTAL | FLIPPED_VERTICAL | FLIPPED_ANTI_DIAGONAL);
    if (gid > 0) {
      used.add(gid - firstGid);
    }
  });

  return [...used].sort((a, b) => a - b);
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

  it('keeps canonical TSX collision metadata complete for each used demo tile id', () => {
    const map = readMap();
    const canonical = parseTsxCanonicalCollision();
    const usedLocalIds = readUsedLocalTileIds(map);

    expect(usedLocalIds.length).toBeGreaterThan(0);
    usedLocalIds.forEach((localId) => {
      expect(canonical.has(localId)).toBe(true);
    });
  });

  it('keeps demo tileset collision signatures in sync with canonical TSX metadata', () => {
    const map = readMap();
    const canonical = parseTsxCanonicalCollision();
    const usedLocalIds = readUsedLocalTileIds(map);
    const demoTiles = map.tilesets[0]?.tiles ?? [];
    const demoById = new Map<number, CollisionSignature>();

    demoTiles.forEach((tile) => {
      demoById.set(tile.id, readCollisionSignature(tile.properties));
    });

    usedLocalIds.forEach((localId) => {
      expect(demoById.get(localId)).toEqual(canonical.get(localId));
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

  it('blocks representative interior movement edges from tile center', () => {
    const parsed = parseTiledMap(readMap());
    const collisionGrid = new CollisionGrid(parsed.tiles.map((row) => row.map((tile) => tile.collision)));

    const blockedRight = collisionGrid.getTilesAt({ x: 2, y: 2 });
    const blockedDown = collisionGrid.getTilesAt({ x: 4, y: 4 });

    expect(canMove('right', 0, 0, blockedRight, DEFAULT_TILE_SIZE, 'pacman')).toBe(false);
    expect(canMove('down', 0, 0, blockedDown, DEFAULT_TILE_SIZE, 'pacman')).toBe(false);
  });
});
