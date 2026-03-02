import fs from 'node:fs';
import path from 'node:path';
import { TILE_SIZE } from '../../config/constants';
import { CollisionGrid } from '../../game/domain/world/CollisionGrid';
import { WorldMapData } from '../../game/domain/world/WorldState';
import { parseTiledMap, TiledMap } from '../../game/infrastructure/map/TiledParser';
import { createBlockedPortalGrid, createPenGateGrid, createPortalPairGrid, openTile } from '../fixtures/collisionFixtures';

export type HarnessFixture = 'default-map' | 'demo-map' | 'portal-pair-grid' | 'portal-blocked-grid' | 'pen-gate-grid';

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function loadDefaultMap(): WorldMapData {
  const mazePath = path.resolve(process.cwd(), 'public/assets/mazes/default/maze.json');
  const tiled = JSON.parse(fs.readFileSync(mazePath, 'utf8')) as TiledMap;
  return parseTiledMap(tiled);
}

function loadDemoMap(): WorldMapData {
  const demoPath = path.resolve(process.cwd(), 'public/assets/mazes/default/demo.json');
  const tiled = JSON.parse(fs.readFileSync(demoPath, 'utf8')) as TiledMap;
  return parseTiledMap(tiled);
}

function makeMapFromCollisionGrid(grid: CollisionGrid, tileSize = TILE_SIZE): WorldMapData {
  const gridRows = grid.toArray();
  const height = gridRows.length;
  const width = gridRows[0]?.length ?? 0;

  const tiles = gridRows.map((row, y) =>
    row.map((collision, x) => ({
      x,
      y,
      rawGid: 0,
      gid: null,
      localId: null,
      imagePath: '(empty)',
      rotation: 0,
      flipX: false,
      flipY: false,
      collision,
    })),
  );

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  return {
    width,
    height,
    tileWidth: tileSize,
    tileHeight: tileSize,
    widthInPixels: width * tileSize,
    heightInPixels: height * tileSize,
    tiles,
    collisionByGid: new Map(),
    imageByGid: new Map(),
    spawnObjects: [
      {
        type: 'pacman',
        properties: [
          { name: 'gridX', value: centerX },
          { name: 'gridY', value: centerY },
        ],
      },
      {
        type: 'ghost-home',
        properties: [
          { name: 'ghostCount', value: 1 },
          { name: 'startX', value: 0 },
          { name: 'endX', value: Math.max(0, width - 1) },
          { name: 'gridY', value: clamp(centerY, 0, Math.max(0, height - 1)) },
        ],
      },
    ],
    pacmanSpawn: {
      type: 'pacman',
      properties: [
        { name: 'gridX', value: centerX },
        { name: 'gridY', value: centerY },
      ],
    },
    ghostHome: {
      type: 'ghost-home',
      properties: [
        { name: 'ghostCount', value: 1 },
        { name: 'startX', value: 0 },
        { name: 'endX', value: Math.max(0, width - 1) },
        { name: 'gridY', value: clamp(centerY, 0, Math.max(0, height - 1)) },
      ],
    },
  };
}

function makeFallbackMap(tileSize = TILE_SIZE): WorldMapData {
  return makeMapFromCollisionGrid(
    new CollisionGrid([
      [openTile(), openTile(), openTile()],
      [openTile(), openTile(), openTile()],
      [openTile(), openTile(), openTile()],
    ]),
    tileSize,
  );
}

export function createHarnessMap(fixture: HarnessFixture): WorldMapData {
  if (fixture === 'default-map') {
    return loadDefaultMap();
  }

  if (fixture === 'demo-map') {
    return loadDemoMap();
  }

  if (fixture === 'portal-pair-grid') {
    return makeMapFromCollisionGrid(createPortalPairGrid());
  }

  if (fixture === 'portal-blocked-grid') {
    return makeMapFromCollisionGrid(createBlockedPortalGrid());
  }

  if (fixture === 'pen-gate-grid') {
    return makeMapFromCollisionGrid(createPenGateGrid());
  }

  return makeFallbackMap();
}
