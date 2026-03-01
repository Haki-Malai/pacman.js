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
    flipped = false;
  } else if (flippedHorizontal && !flippedVertical && flippedAntiDiagonal) {
    rotation = Math.PI / 2;
    flipped = false;
  } else if (flippedHorizontal && !flippedVertical && !flippedAntiDiagonal) {
    rotation = 0;
    flipped = true;
  } else if (!flippedHorizontal && flippedVertical && flippedAntiDiagonal) {
    rotation = (3 * Math.PI) / 2;
    flipped = false;
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
  const read = (key: string): unknown => properties[key];
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

  const rotationSteps = ((Math.round(rotation / (Math.PI / 2)) % 4) + 4) % 4;
  for (let i = 0; i < rotationSteps; i += 1) {
    edges = {
      up: edges.left,
      right: edges.up,
      down: edges.right,
      left: edges.down,
    };
  }

  return {
    collides: base.collides,
    penGate: base.penGate,
    portal: base.portal,
    ...edges,
  };
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
    if (!property || typeof property.name !== 'string') {
      return;
    }
    record[property.name] = property.value;
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
  properties: object.properties?.map((property): WorldProperty => ({
    name: property.name,
    type: property.type,
    value: property.value,
  })),
});

const PORTAL_RESOLVE_MAX_RADIUS = 4;

interface ResolvedPortalEndpoint {
  tile: { x: number; y: number };
  pairId?: string;
  order: number;
}

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

function isWalkablePortalTile(tile: WorldTile | undefined): tile is WorldTile {
  if (!tile) {
    return false;
  }

  return tile.gid !== null && !tile.collision.collides && !tile.collision.penGate;
}

function clampToGrid(value: number, maxExclusive: number): number {
  if (maxExclusive <= 0) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value >= maxExclusive) {
    return maxExclusive - 1;
  }

  return value;
}

function resolvePortalTileFromObject(params: {
  objectX: number;
  objectY: number;
  tileWidth: number;
  tileHeight: number;
  width: number;
  height: number;
  tiles: WorldTile[][];
}): { x: number; y: number } | null {
  if (
    !Number.isFinite(params.objectX) ||
    !Number.isFinite(params.objectY) ||
    !Number.isFinite(params.tileWidth) ||
    !Number.isFinite(params.tileHeight) ||
    params.tileWidth <= 0 ||
    params.tileHeight <= 0
  ) {
    return null;
  }

  const originX = clampToGrid(Math.floor(params.objectX / params.tileWidth), params.width);
  const originY = clampToGrid(Math.floor(params.objectY / params.tileHeight), params.height);

  for (let distance = 0; distance <= PORTAL_RESOLVE_MAX_RADIUS; distance += 1) {
    const minY = Math.max(0, originY - distance);
    const maxY = Math.min(params.height - 1, originY + distance);

    for (let y = minY; y <= maxY; y += 1) {
      const remainingDistance = distance - Math.abs(y - originY);
      const minX = Math.max(0, originX - remainingDistance);
      const maxX = Math.min(params.width - 1, originX + remainingDistance);

      for (let x = minX; x <= maxX; x += 1) {
        if (Math.abs(x - originX) + Math.abs(y - originY) !== distance) {
          continue;
        }

        const tile = params.tiles[y]?.[x];
        if (isWalkablePortalTile(tile)) {
          return { x, y };
        }
      }
    }
  }

  return null;
}

function readObjectStringProperty(object: WorldObject, name: string): string | undefined {
  const value = object.properties?.find((property) => property.name === name)?.value;
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function compareResolvedEndpoints(a: ResolvedPortalEndpoint, b: ResolvedPortalEndpoint): number {
  if (a.tile.y !== b.tile.y) {
    return a.tile.y - b.tile.y;
  }
  if (a.tile.x !== b.tile.x) {
    return a.tile.x - b.tile.x;
  }
  return a.order - b.order;
}

function buildPortalPairs(endpoints: ResolvedPortalEndpoint[]): PortalPair[] {
  const groupedByPairId = new Map<string, ResolvedPortalEndpoint[]>();
  const consumedTiles = new Set<string>();
  const portalPairs: PortalPair[] = [];

  endpoints.forEach((endpoint) => {
    if (!endpoint.pairId) {
      return;
    }

    const group = groupedByPairId.get(endpoint.pairId) ?? [];
    group.push(endpoint);
    groupedByPairId.set(endpoint.pairId, group);
  });

  const pairIds = [...groupedByPairId.keys()].sort((a, b) => a.localeCompare(b));
  pairIds.forEach((pairId) => {
    const group = groupedByPairId.get(pairId);
    if (!group) {
      return;
    }

    group.sort(compareResolvedEndpoints);
    for (let index = 0; index + 1 < group.length; index += 2) {
      const from = group[index];
      const to = group[index + 1];
      portalPairs.push({
        from: { ...from.tile },
        to: { ...to.tile },
      });
      consumedTiles.add(`${from.tile.x},${from.tile.y}`);
      consumedTiles.add(`${to.tile.x},${to.tile.y}`);
    }
  });

  const fallbackEndpoints = endpoints
    .filter((endpoint) => !consumedTiles.has(`${endpoint.tile.x},${endpoint.tile.y}`))
    .sort(compareResolvedEndpoints);

  for (let index = 0; index + 1 < fallbackEndpoints.length; index += 2) {
    const from = fallbackEndpoints[index];
    const to = fallbackEndpoints[index + 1];
    portalPairs.push({
      from: { ...from.tile },
      to: { ...to.tile },
    });
  }

  return portalPairs;
}

function applyPortalFlagsFromSpawnObjects(params: {
  spawnObjects: WorldObject[];
  tiles: WorldTile[][];
  tileWidth: number;
  tileHeight: number;
  width: number;
  height: number;
}): PortalPair[] {
  const endpointsByTile = new Map<string, ResolvedPortalEndpoint>();

  params.spawnObjects.forEach((object, order) => {
    if (object.type !== 'portal' || typeof object.x !== 'number' || typeof object.y !== 'number') {
      return;
    }

    const resolvedTile = resolvePortalTileFromObject({
      objectX: object.x,
      objectY: object.y,
      tileWidth: params.tileWidth,
      tileHeight: params.tileHeight,
      width: params.width,
      height: params.height,
      tiles: params.tiles,
    });

    if (!resolvedTile) {
      return;
    }

    const target = params.tiles[resolvedTile.y]?.[resolvedTile.x];
    if (!target) {
      return;
    }

    const key = `${resolvedTile.x},${resolvedTile.y}`;
    const pairId = readObjectStringProperty(object, 'pairId');
    const existing = endpointsByTile.get(key);
    if (existing) {
      if (!existing.pairId && pairId) {
        existing.pairId = pairId;
      }
      return;
    }

    target.collision.portal = true;
    endpointsByTile.set(key, {
      tile: resolvedTile,
      pairId,
      order,
    });
  });

  const endpoints = [...endpointsByTile.values()].sort(compareResolvedEndpoints);
  return buildPortalPairs(endpoints);
}

function applyVoidLeakBoundaryGuards(tiles: WorldTile[][]): void {
  const isVoidTile = (tile: WorldTile | undefined): boolean => !tile || tile.gid === null;
  const directions: Array<{ dx: number; dy: number; edge: keyof Pick<CollisionTile, 'up' | 'right' | 'down' | 'left'> }> = [
    { dx: 0, dy: -1, edge: 'up' },
    { dx: 1, dy: 0, edge: 'right' },
    { dx: 0, dy: 1, edge: 'down' },
    { dx: -1, dy: 0, edge: 'left' },
  ];

  for (let y = 0; y < tiles.length; y += 1) {
    const row = tiles[y];
    if (!row) {
      continue;
    }

    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];
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
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    throw new Error('Maze layer width/height must be positive numbers');
  }

  const collisionByGid = new Map<number, CollisionTile>();
  const imageByGid = new Map<number, string>();

  map.tilesets.forEach((tileset) => {
    const firstgid = tileset.firstgid;
    if (typeof firstgid !== 'number' || !Array.isArray(tileset.tiles)) {
      return;
    }

    tileset.tiles.forEach((tile) => {
      if (!tile || typeof tile.id !== 'number') {
        return;
      }

      const gid = firstgid + tile.id;
      const properties = toPropertyRecord(tile.properties);
      collisionByGid.set(gid, readCollisionTileFromProperties(properties));
      if (typeof tile.image === 'string') {
        imageByGid.set(gid, tile.image);
      }
    });
  });

  const tiles: WorldTile[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: WorldTile[] = [];

    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const rawGid = tileLayer.data[index] ?? 0;
      const gidData = parseGid(rawGid);

      if (gidData.gid <= 0) {
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

      const tileset = getTilesetForGid(gidData.gid, map.tilesets);
      const localId = tileset ? gidData.gid - tileset.firstgid : gidData.gid;
      const baseCollision = collisionByGid.get(gidData.gid) ?? createEmptyCollisionTile();
      const flipX = gidData.flipped;
      const flipY = false;
      const collision = orientCollisionTile(baseCollision, gidData.rotation, flipX, flipY);

      row.push({
        x,
        y,
        rawGid,
        gid: gidData.gid,
        localId,
        imagePath: imageByGid.get(gidData.gid) ?? '(unknown)',
        rotation: gidData.rotation,
        flipX,
        flipY,
        collision,
      });
    }

    tiles.push(row);
  }

  const spawnLayer = map.layers.find((layer) => isRecord(layer) && layer.type === 'objectgroup' && layer.name === 'Spawns') as
    | TiledObjectLayer
    | undefined;

  const spawnObjects = (spawnLayer?.objects ?? []).map((object) => toWorldObject(object));

  const portalPairs = applyPortalFlagsFromSpawnObjects({
    spawnObjects,
    tiles,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    width,
    height,
  });
  applyVoidLeakBoundaryGuards(tiles);

  return {
    width,
    height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    widthInPixels: width * map.tilewidth,
    heightInPixels: height * map.tileheight,
    tiles,
    collisionByGid,
    imageByGid,
    portalPairs,
    spawnObjects,
    pacmanSpawn: spawnObjects.find((object) => object.type === 'pacman'),
    ghostHome: spawnObjects.find((object) => object.type === 'ghost-home'),
  };
}
