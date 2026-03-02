import { CollisionTile, createEmptyCollisionTile } from '../../domain/world/CollisionGrid';
import { PortalPair, WorldMapData, WorldObject, WorldProperty, WorldTile } from '../../domain/world/WorldState';

export const FLIPPED_HORIZONTAL = 0x80000000;
export const FLIPPED_VERTICAL = 0x40000000;
export const FLIPPED_ANTI_DIAGONAL = 0x20000000;

export interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

export interface TiledTile {
  id: number;
  image?: string;
  properties?: TiledProperty[];
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  tiles?: TiledTile[];
}

export interface TiledObject {
  id?: number;
  name?: string;
  type?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

export interface TiledTileLayer {
  name: string;
  type: 'tilelayer';
  width: number;
  height: number;
  data: number[];
}

export interface TiledObjectLayer {
  name: string;
  type: 'objectgroup';
  objects?: TiledObject[];
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Array<TiledTileLayer | TiledObjectLayer | Record<string, unknown>>;
  tilesets: TiledTileset[];
}

export interface ParsedGid {
  gid: number;
  flippedHorizontal: boolean;
  flippedVertical: boolean;
  flippedAntiDiagonal: boolean;
  rotation: number;
  flipped: boolean;
}

interface TrimBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

type PortalSide = 'left' | 'right' | 'top' | 'bottom';

interface PortalCandidate {
  tile: { x: number; y: number };
  side: PortalSide;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function parseGid(rawGid: number): ParsedGid {
  const flippedHorizontal = Boolean(rawGid & FLIPPED_HORIZONTAL);
  const flippedVertical = Boolean(rawGid & FLIPPED_VERTICAL);
  const flippedAntiDiagonal = Boolean(rawGid & FLIPPED_ANTI_DIAGONAL);
  const gid = rawGid & ~(FLIPPED_HORIZONTAL | FLIPPED_VERTICAL | FLIPPED_ANTI_DIAGONAL);

  let rotation = 0;
  let flipped = false;

  if (flippedHorizontal && flippedVertical && flippedAntiDiagonal) {
    rotation = Math.PI / 2;
    flipped = true;
  } else if (flippedHorizontal && flippedVertical && !flippedAntiDiagonal) {
    rotation = Math.PI;
  } else if (flippedHorizontal && !flippedVertical && flippedAntiDiagonal) {
    rotation = Math.PI / 2;
  } else if (flippedHorizontal && !flippedVertical && !flippedAntiDiagonal) {
    flipped = true;
  } else if (!flippedHorizontal && flippedVertical && flippedAntiDiagonal) {
    rotation = (3 * Math.PI) / 2;
  } else if (!flippedHorizontal && flippedVertical && !flippedAntiDiagonal) {
    rotation = Math.PI;
    flipped = true;
  } else if (!flippedHorizontal && !flippedVertical && flippedAntiDiagonal) {
    rotation = (3 * Math.PI) / 2;
    flipped = true;
  }

  return {
    gid,
    flippedHorizontal,
    flippedVertical,
    flippedAntiDiagonal,
    rotation,
    flipped,
  };
}

export function readCollisionTileFromProperties(properties: Record<string, unknown>): CollisionTile {
  const read = (name: string): unknown => properties[name];
  const toBool = (value: unknown): boolean => Boolean(value);

  return {
    collides: toBool(read('collides')),
    penGate: toBool(read('penGate')),
    portal: toBool(read('portal')),
    up: toBool(read('up') ?? read('blocksUp')),
    down: toBool(read('down') ?? read('blocksDown')),
    left: toBool(read('left') ?? read('blocksLeft')),
    right: toBool(read('right') ?? read('blocksRight')),
  };
}

export function orientCollisionTile(base: CollisionTile, rotation: number, flipX: boolean, flipY: boolean): CollisionTile {
  let edges = {
    up: base.up,
    right: base.right,
    down: base.down,
    left: base.left,
  };

  if (flipX) {
    [edges.left, edges.right] = [edges.right, edges.left];
  }
  if (flipY) {
    [edges.up, edges.down] = [edges.down, edges.up];
  }

  const steps = ((Math.round(rotation / (Math.PI / 2)) % 4) + 4) % 4;
  for (let i = 0; i < steps; i += 1) {
    edges = {
      up: edges.left,
      right: edges.up,
      down: edges.right,
      left: edges.down,
    };
  }

  return { collides: base.collides, penGate: base.penGate, portal: base.portal, ...edges };
}

const getTilesetForGid = (gid: number, tilesets: TiledTileset[]): TiledTileset | undefined => {
  const sorted = [...tilesets].sort((a, b) => a.firstgid - b.firstgid);
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const nextFirstgid = sorted[i + 1]?.firstgid ?? Number.POSITIVE_INFINITY;
    if (gid >= current.firstgid && gid < nextFirstgid) {
      return current;
    }
  }
  return undefined;
};

const toPropertyRecord = (properties?: TiledProperty[]): Record<string, unknown> => {
  const record: Record<string, unknown> = {};
  if (!Array.isArray(properties)) {
    return record;
  }
  properties.forEach((property) => {
    if (property && typeof property.name === 'string') {
      record[property.name] = property.value;
    }
  });
  return record;
};

const toWorldObject = (object: TiledObject): WorldObject => ({
  id: object.id,
  name: object.name,
  type: object.type,
  visible: object.visible,
  x: object.x,
  y: object.y,
  width: object.width,
  height: object.height,
  properties: object.properties?.map(
    (property): WorldProperty => ({ name: property.name, type: property.type, value: property.value }),
  ),
});

function createBlockingCollisionTile(): CollisionTile {
  return {
    collides: true,
    penGate: false,
    portal: false,
    up: true,
    down: true,
    left: true,
    right: true,
  };
}

function isVoidTile(tile: WorldTile | undefined): boolean {
  return !tile || tile.gid === null;
}

function isFullyBlockingTile(tile: WorldTile | undefined): boolean {
  if (!tile) {
    return true;
  }
  const collision = tile.collision;
  return collision.collides && collision.up && collision.right && collision.down && collision.left;
}

function canBePortalCandidate(tile: WorldTile | undefined): tile is WorldTile {
  if (!tile || tile.gid === null) {
    return false;
  }
  if (tile.collision.penGate) {
    return false;
  }
  return !isFullyBlockingTile(tile);
}

function computeTrimBounds(tiles: WorldTile[][]): TrimBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < (tiles[y]?.length ?? 0); x += 1) {
      if (tiles[y]?.[x]?.gid === null) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, width: tiles[0]?.length ?? 0, height: tiles.length };
  }

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function trimTiles(tiles: WorldTile[][], bounds: TrimBounds): WorldTile[][] {
  const trimmed: WorldTile[][] = [];
  for (let y = 0; y < bounds.height; y += 1) {
    const row: WorldTile[] = [];
    for (let x = 0; x < bounds.width; x += 1) {
      const source = tiles[bounds.minY + y]?.[bounds.minX + x];
      if (!source) {
        row.push({
          x,
          y,
          rawGid: 0,
          gid: null,
          localId: null,
          imagePath: '(empty)',
          rotation: 0,
          flipX: false,
          flipY: false,
          collision: createBlockingCollisionTile(),
        });
        continue;
      }
      row.push({ ...source, x, y });
    }
    trimmed.push(row);
  }
  return trimmed;
}

function rebaseWorldObject(object: WorldObject, bounds: TrimBounds, tileWidth: number, tileHeight: number): WorldObject {
  const offsetX = bounds.minX * tileWidth;
  const offsetY = bounds.minY * tileHeight;

  const properties = object.properties?.map((property) => {
    const shouldShiftX = property.name === 'gridX' || property.name === 'startX' || property.name === 'endX';
    const shouldShiftY = property.name === 'gridY';
    if (!shouldShiftX && !shouldShiftY) {
      return property;
    }
    if (typeof property.value !== 'number') {
      return property;
    }
    return {
      ...property,
      value: shouldShiftX ? property.value - bounds.minX : property.value - bounds.minY,
    };
  });

  return {
    ...object,
    x: typeof object.x === 'number' ? object.x - offsetX : object.x,
    y: typeof object.y === 'number' ? object.y - offsetY : object.y,
    properties,
  };
}

function findInteriorPortalCandidates(tiles: WorldTile[][]): PortalCandidate[] {
  const candidates: PortalCandidate[] = [];
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;

  if (height < 3 || width < 3) {
    return candidates;
  }

  for (let y = 0; y < height; y += 1) {
    const leftCandidate = tiles[y]?.[1];
    const leftOuter = tiles[y]?.[0];
    if (canBePortalCandidate(leftCandidate) && leftOuter && leftOuter.gid !== null && !leftOuter.collision.left) {
      candidates.push({ tile: { x: 1, y }, side: 'left' });
    }

    const rightCandidate = tiles[y]?.[width - 2];
    const rightOuter = tiles[y]?.[width - 1];
    if (
      canBePortalCandidate(rightCandidate) &&
      rightOuter &&
      rightOuter.gid !== null &&
      !rightOuter.collision.right
    ) {
      candidates.push({ tile: { x: width - 2, y }, side: 'right' });
    }
  }

  for (let x = 0; x < width; x += 1) {
    const topCandidate = tiles[1]?.[x];
    const topOuter = tiles[0]?.[x];
    if (canBePortalCandidate(topCandidate) && topOuter && topOuter.gid !== null && !topOuter.collision.up) {
      candidates.push({ tile: { x, y: 1 }, side: 'top' });
    }

    const bottomCandidate = tiles[height - 2]?.[x];
    const bottomOuter = tiles[height - 1]?.[x];
    if (
      canBePortalCandidate(bottomCandidate) &&
      bottomOuter &&
      bottomOuter.gid !== null &&
      !bottomOuter.collision.down
    ) {
      candidates.push({ tile: { x, y: height - 2 }, side: 'bottom' });
    }
  }

  return candidates;
}

function findBoundaryPortalCandidates(tiles: WorldTile[][]): PortalCandidate[] {
  const candidates: PortalCandidate[] = [];
  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < (tiles[y]?.length ?? 0); x += 1) {
      const tile = tiles[y]?.[x];
      if (!tile || tile.gid === null || tile.collision.collides || tile.collision.penGate) {
        continue;
      }

      const upNeighbor = tiles[y - 1]?.[x];
      const downNeighbor = tiles[y + 1]?.[x];
      const leftNeighbor = tiles[y]?.[x - 1];
      const rightNeighbor = tiles[y]?.[x + 1];

      if (isVoidTile(leftNeighbor) && !tile.collision.left) {
        candidates.push({ tile: { x, y }, side: 'left' });
      }
      if (isVoidTile(rightNeighbor) && !tile.collision.right) {
        candidates.push({ tile: { x, y }, side: 'right' });
      }
      if (isVoidTile(upNeighbor) && !tile.collision.up) {
        candidates.push({ tile: { x, y }, side: 'top' });
      }
      if (isVoidTile(downNeighbor) && !tile.collision.down) {
        candidates.push({ tile: { x, y }, side: 'bottom' });
      }
    }
  }
  return candidates;
}

function clearPortalFlags(tiles: WorldTile[][]): void {
  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < (tiles[y]?.length ?? 0); x += 1) {
      const tile = tiles[y]?.[x];
      if (!tile || tile.gid === null) {
        continue;
      }
      tile.collision.portal = false;
    }
  }
}

function preferWalkableCandidates(candidates: PortalCandidate[], tiles: WorldTile[][]): PortalCandidate[] {
  const walkable = candidates.filter((candidate) => {
    const tile = tiles[candidate.tile.y]?.[candidate.tile.x];
    return Boolean(tile && !tile.collision.collides);
  });

  return walkable.length > 0 ? walkable : candidates;
}

function pickCenteredCandidate(candidates: PortalCandidate[], side: PortalSide, width: number, height: number): PortalCandidate | null {
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const sideCandidates = candidates.filter((candidate) => candidate.side === side);
  if (sideCandidates.length === 0) {
    return null;
  }

  sideCandidates.sort((a, b) => {
    if (side === 'left' || side === 'right') {
      const distanceDiff = Math.abs(a.tile.y - centerY) - Math.abs(b.tile.y - centerY);
      if (distanceDiff !== 0) return distanceDiff;
      if (a.tile.x !== b.tile.x) return side === 'left' ? a.tile.x - b.tile.x : b.tile.x - a.tile.x;
      return a.tile.y - b.tile.y;
    }

    const distanceDiff = Math.abs(a.tile.x - centerX) - Math.abs(b.tile.x - centerX);
    if (distanceDiff !== 0) return distanceDiff;
    if (a.tile.y !== b.tile.y) return side === 'top' ? a.tile.y - b.tile.y : b.tile.y - a.tile.y;
    return a.tile.x - b.tile.x;
  });

  return sideCandidates[0] ?? null;
}

function inferPortalPairs(tiles: WorldTile[][]): PortalPair[] {
  if (tiles.length === 0 || (tiles[0]?.length ?? 0) === 0) {
    return [];
  }

  clearPortalFlags(tiles);

  const interiorCandidates = findInteriorPortalCandidates(tiles);
  const boundaryCandidates = findBoundaryPortalCandidates(tiles);
  const sides: PortalSide[] = ['left', 'right', 'top', 'bottom'];
  const candidates: PortalCandidate[] = [];

  sides.forEach((side) => {
    const interiorForSide = interiorCandidates.filter((candidate) => candidate.side === side);
    if (interiorForSide.length > 0) {
      candidates.push(...preferWalkableCandidates(interiorForSide, tiles));
      return;
    }
    candidates.push(...boundaryCandidates.filter((candidate) => candidate.side === side));
  });

  const width = tiles[0]?.length ?? 0;
  const height = tiles.length;

  const left = pickCenteredCandidate(candidates, 'left', width, height);
  const right = pickCenteredCandidate(candidates, 'right', width, height);
  const top = pickCenteredCandidate(candidates, 'top', width, height);
  const bottom = pickCenteredCandidate(candidates, 'bottom', width, height);

  const pairs: PortalPair[] = [];
  if (left && right) {
    pairs.push({ from: { ...left.tile }, to: { ...right.tile } });
  }
  if (top && bottom) {
    pairs.push({ from: { ...top.tile }, to: { ...bottom.tile } });
  }

  pairs.forEach((pair) => {
    const from = tiles[pair.from.y]?.[pair.from.x];
    const to = tiles[pair.to.y]?.[pair.to.x];
    if (from) from.collision.portal = true;
    if (to) to.collision.portal = true;
  });

  return pairs;
}

function applyVoidLeakBoundaryGuards(tiles: WorldTile[][]): void {
  const directions: Array<{ dx: number; dy: number; edge: keyof Pick<CollisionTile, 'up' | 'right' | 'down' | 'left'> }> = [
    { dx: 0, dy: -1, edge: 'up' },
    { dx: 1, dy: 0, edge: 'right' },
    { dx: 0, dy: 1, edge: 'down' },
    { dx: -1, dy: 0, edge: 'left' },
  ];

  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < (tiles[y]?.length ?? 0); x += 1) {
      const tile = tiles[y]?.[x];
      if (!tile || tile.gid === null || tile.collision.portal) {
        continue;
      }

      const leaksToVoid = directions.some(({ dx, dy, edge }) => {
        const neighbor = tiles[y + dy]?.[x + dx];
        return isVoidTile(neighbor) && !tile.collision[edge];
      });

      if (leaksToVoid) {
        tile.collision = createBlockingCollisionTile();
      }
    }
  }
}

export function parseTiledMap(map: TiledMap): WorldMapData {
  const mazeLayer = map.layers.find((layer) => isRecord(layer) && layer.type === 'tilelayer' && layer.name === 'Maze') as
    | TiledTileLayer
    | undefined;
  const fallbackLayer = map.layers.find((layer) => isRecord(layer) && layer.type === 'tilelayer') as TiledTileLayer | undefined;
  const tileLayer = mazeLayer ?? fallbackLayer;
  if (!tileLayer || !Array.isArray(tileLayer.data)) {
    throw new Error('Maze tile layer is required in maze.json');
  }

  const width = tileLayer.width;
  const height = tileLayer.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Maze layer width/height must be positive numbers');
  }

  const collisionByGid = new Map<number, CollisionTile>();
  const imageByGid = new Map<number, string>();

  map.tilesets.forEach((tileset) => {
    if (!Number.isFinite(tileset.firstgid) || !Array.isArray(tileset.tiles)) {
      return;
    }
    tileset.tiles.forEach((tile) => {
      if (!tile || !Number.isFinite(tile.id)) {
        return;
      }
      const gid = tileset.firstgid + tile.id;
      const properties = toPropertyRecord(tile.properties);
      collisionByGid.set(gid, readCollisionTileFromProperties(properties));
      if (typeof tile.image === 'string') {
        imageByGid.set(gid, tile.image);
      }
    });
  });

  const rawTiles: WorldTile[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: WorldTile[] = [];
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const rawGid = tileLayer.data[index] ?? 0;
      const parsed = parseGid(rawGid);
      if (parsed.gid <= 0) {
        row.push({
          x,
          y,
          rawGid,
          gid: null,
          localId: null,
          imagePath: '(empty)',
          rotation: 0,
          flipX: false,
          flipY: false,
          collision: createBlockingCollisionTile(),
        });
        continue;
      }

      const tileset = getTilesetForGid(parsed.gid, map.tilesets);
      const localId = tileset ? parsed.gid - tileset.firstgid : parsed.gid;
      const baseCollision = collisionByGid.get(parsed.gid) ?? createEmptyCollisionTile();
      row.push({
        x,
        y,
        rawGid,
        gid: parsed.gid,
        localId,
        imagePath: imageByGid.get(parsed.gid) ?? '(unknown)',
        rotation: parsed.rotation,
        flipX: parsed.flipped,
        flipY: false,
        collision: orientCollisionTile(baseCollision, parsed.rotation, parsed.flipped, false),
      });
    }
    rawTiles.push(row);
  }

  const trimBounds = computeTrimBounds(rawTiles);
  const tiles = trimTiles(rawTiles, trimBounds);

  const spawnLayer = map.layers.find((layer) => isRecord(layer) && layer.type === 'objectgroup' && layer.name === 'Spawns') as
    | TiledObjectLayer
    | undefined;
  const dotsLayer = map.layers.find((layer) => isRecord(layer) && layer.type === 'objectgroup' && layer.name === 'Dots') as
    | TiledObjectLayer
    | undefined;

  const spawnObjects = (spawnLayer?.objects ?? [])
    .map((object) => toWorldObject(object))
    .map((object) => rebaseWorldObject(object, trimBounds, map.tilewidth, map.tileheight));
  const collectibleObjects = (dotsLayer?.objects ?? [])
    .map((object) => toWorldObject(object))
    .map((object) => rebaseWorldObject(object, trimBounds, map.tilewidth, map.tileheight));

  const portalPairs = inferPortalPairs(tiles);
  applyVoidLeakBoundaryGuards(tiles);

  const trimmedCollisionByGid = new Map<number, CollisionTile>();
  collisionByGid.forEach((value, key) => {
    trimmedCollisionByGid.set(key, { ...value });
  });

  return {
    width: trimBounds.width,
    height: trimBounds.height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    widthInPixels: trimBounds.width * map.tilewidth,
    heightInPixels: trimBounds.height * map.tileheight,
    tiles,
    collisionByGid: trimmedCollisionByGid,
    imageByGid,
    portalPairs,
    spawnObjects,
    collectibleObjects,
    pacmanSpawn: spawnObjects.find((object) => object.type === 'pacman'),
    ghostHome: spawnObjects.find((object) => object.type === 'ghost-home'),
  };
}
