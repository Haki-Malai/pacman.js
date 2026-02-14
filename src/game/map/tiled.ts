import { CollisionTile } from '../../types';

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

export interface ParsedMazeTile {
  x: number;
  y: number;
  rawGid: number;
  gid: number | null;
  localId: number | null;
  imagePath: string;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  collision: CollisionTile;
}

export interface ParsedTiledMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  widthInPixels: number;
  heightInPixels: number;
  tiles: ParsedMazeTile[][];
  collisionByGid: Map<number, CollisionTile>;
  imageByGid: Map<number, string>;
  spawnObjects: TiledObject[];
  pacmanSpawn?: TiledObject;
  ghostHome?: TiledObject;
}

export const createEmptyCollisionTile = (): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

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
  } else {
    rotation = 0;
    flipped = false;
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

export function parseTiledMap(map: TiledMap): ParsedTiledMap {
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

  const tiles: ParsedMazeTile[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: ParsedMazeTile[] = [];

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
          collision: createEmptyCollisionTile(),
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
  const spawnObjects = spawnLayer?.objects ?? [];

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
    spawnObjects,
    pacmanSpawn: spawnObjects.find((object) => object.type === 'pacman'),
    ghostHome: spawnObjects.find((object) => object.type === 'ghost-home'),
  };
}

export function getObjectNumberProperty(obj: TiledObject | undefined, name: string): number | undefined {
  const property = obj?.properties?.find((entry) => entry.name === name);
  return typeof property?.value === 'number' ? property.value : undefined;
}
