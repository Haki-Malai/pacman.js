import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Camera2D } from '../engine/camera';
import { getObjectNumberProperty } from '../game/domain/services/GhostJailService';
import { canMove } from '../game/domain/services/MovementRules';
import { buildPointLayout } from '../game/domain/services/PointLayoutService';
import { DIRECTIONS, DIRECTION_VECTORS } from '../game/domain/valueObjects/Direction';
import { RenderSystem } from '../game/systems/RenderSystem';
import { CanvasRendererAdapter } from '../game/infrastructure/adapters/CanvasRendererAdapter';
import { AssetCatalog } from '../game/infrastructure/assets/AssetCatalog';
import { TiledMap, parseTiledMap } from '../game/infrastructure/map/TiledParser';
import { CollisionGrid, CollisionTile, createEmptyCollisionTile } from '../game/domain/world/CollisionGrid';
import { GhostEntity } from '../game/domain/entities/GhostEntity';
import { WorldMapData, WorldState, WorldTile } from '../game/domain/world/WorldState';
import { getGameState, resetGameState } from '../state/gameState';

function createCollisionTile(overrides: Partial<CollisionTile> = {}): CollisionTile {
  return {
    ...createEmptyCollisionTile(),
    ...overrides,
  };
}

function createMapFixture(collisionRows: CollisionTile[][]): {
  map: WorldMapData;
  collisionGrid: CollisionGrid;
} {
  const height = collisionRows.length;
  const width = collisionRows[0]?.length ?? 0;

  const tiles: WorldTile[][] = collisionRows.map((row, y) =>
    row.map((collision, x) => ({
      x,
      y,
      rawGid: 1,
      gid: 1,
      localId: 1,
      imagePath: 'tile.png',
      rotation: 0,
      flipX: false,
      flipY: false,
      collision: { ...collision },
    })),
  );

  const map: WorldMapData = {
    width,
    height,
    tileWidth: 16,
    tileHeight: 16,
    widthInPixels: width * 16,
    heightInPixels: height * 16,
    tiles,
    collisionByGid: new Map([[1, createCollisionTile()]]),
    imageByGid: new Map([[1, 'tile.png']]),
    spawnObjects: [],
  };

  return {
    map,
    collisionGrid: new CollisionGrid(collisionRows.map((row) => row.map((tile) => ({ ...tile })))),
  };
}

interface RenderHarnessOptions {
  collisionRows?: CollisionTile[][];
  pacmanTile?: { x: number; y: number };
}

function toTileCenter(tile: { x: number; y: number }, tileSize = 16): { x: number; y: number } {
  return {
    x: tile.x * tileSize + tileSize / 2,
    y: tile.y * tileSize + tileSize / 2,
  };
}

function isMapVoidTile(map: WorldMapData, tile: { x: number; y: number }): boolean {
  if (tile.x < 0 || tile.x >= map.width || tile.y < 0 || tile.y >= map.height) {
    return false;
  }

  const mapTile = map.tiles[tile.y]?.[tile.x];
  return !mapTile || mapTile.gid === null;
}

function hasNavigableVoidBoundaryEdge(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tile: { x: number; y: number },
  tileSize: number,
): boolean {
  const collisionTiles = collisionGrid.getTilesAt(tile);

  return DIRECTIONS.some((direction) => {
    const vector = DIRECTION_VECTORS[direction];
    const neighbor = { x: tile.x + vector.dx, y: tile.y + vector.dy };

    if (!isMapVoidTile(map, neighbor)) {
      return false;
    }

    return canMove(direction, 0, 0, collisionTiles, tileSize, 'pacman');
  });
}

function collectVoidBoundaryForbiddenTiles(
  map: WorldMapData,
  collisionGrid: CollisionGrid,
  tileSize: number,
): Array<{ x: number; y: number }> {
  const forbidden: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = map.tiles[y]?.[x];
      if (!tile || tile.gid === null || tile.collision.penGate) {
        continue;
      }

      if (hasNavigableVoidBoundaryEdge(map, collisionGrid, { x, y }, tileSize)) {
        forbidden.push({ x, y });
      }
    }
  }

  return forbidden;
}

function createWorld(map: WorldMapData, collisionGrid: CollisionGrid, pacmanTile: { x: number; y: number }): WorldState {
  const center = toTileCenter(pacmanTile, map.tileWidth);

  return {
    map,
    tileSize: map.tileWidth,
    collisionGrid,
    pacmanAnimation: {
      frame: 0,
      elapsedMs: 0,
      sequenceIndex: 0,
      active: false,
    },
      pacman: {
        tile: { ...pacmanTile },
        moved: { x: 0, y: 0 },
        x: center.x,
        y: center.y,
      displayWidth: 10,
      displayHeight: 10,
      angle: 0,
      flipX: false,
        flipY: false,
        portalBlinkRemainingMs: 0,
        portalBlinkElapsedMs: 0,
        deathRecoveryRemainingMs: 0,
        deathRecoveryElapsedMs: 0,
        deathRecoveryNextToggleAtMs: 0,
        deathRecoveryVisible: true,
      },
      ghosts: [],
      ghostScaredRecovery: new Map(),
      ghostAnimations: new Map(),
    } as unknown as WorldState;
}

function createRenderHarness(options: RenderHarnessOptions = {}): {
  world: WorldState;
  renderSystem: RenderSystem;
  center: { x: number; y: number };
} {
  const collisionRows =
    options.collisionRows ?? [[createCollisionTile({ collides: true, left: true }), createCollisionTile({ collides: true, right: true })]];
  const pacmanTile = options.pacmanTile ?? { x: 0, y: 0 };
  const { map, collisionGrid } = createMapFixture(collisionRows);
  const center = toTileCenter(pacmanTile, map.tileWidth);

  const world = createWorld(map, collisionGrid, pacmanTile);

  const renderer = {
    clear: () => {
      // no-op for unit tests
    },
    beginWorld: () => {
      // no-op for unit tests
    },
    endWorld: () => {
      // no-op for unit tests
    },
    drawImageCentered: () => {
      // no-op for unit tests
    },
    drawSpriteFrame: () => {
      // no-op for unit tests
    },
    context: {
      save: () => {
        // no-op for unit tests
      },
      restore: () => {
        // no-op for unit tests
      },
      drawImage: () => {
        // no-op for unit tests
      },
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D,
  } as unknown as CanvasRendererAdapter;

  const assets = {
    getCollectibleImage: () => null,
    getTileImage: () => null,
    getSpriteSheet: () => null,
  } as unknown as AssetCatalog;

  const renderSystem = new RenderSystem(world, renderer, {} as Camera2D, assets);

  return {
    world,
    renderSystem,
    center,
  };
}

function loadProductionMazeFixture(): {
  map: WorldMapData;
  collisionGrid: CollisionGrid;
  startTile: { x: number; y: number };
} {
  const mazePath = path.resolve(process.cwd(), 'public/assets/mazes/default/maze.json');
  const tiledMap = JSON.parse(fs.readFileSync(mazePath, 'utf8')) as TiledMap;
  const map = parseTiledMap(tiledMap);
  const collisionGrid = new CollisionGrid(map.tiles.map((row) => row.map((tile) => ({ ...tile.collision }))));

  const spawnX = getObjectNumberProperty(map.pacmanSpawn, 'gridX');
  const spawnY = getObjectNumberProperty(map.pacmanSpawn, 'gridY');
  expect(typeof spawnX).toBe('number');
  expect(typeof spawnY).toBe('number');

  return {
    map,
    collisionGrid,
    startTile: { x: spawnX as number, y: spawnY as number },
  };
}

describe('RenderSystem point consumption gate', () => {
  beforeEach(() => {
    resetGameState(0);
  });

  it('does not consume points while Pac-Man is between tile centers', () => {
    const { world, renderSystem, center } = createRenderHarness();

    world.pacman.moved.x = 0.02;
    world.pacman.x = center.x + 0.02;
    renderSystem.update(16);

    expect(getGameState().score).toBe(0);

    world.pacman.moved.x = 0;
    world.pacman.x = center.x;
    renderSystem.update(16);

    expect(getGameState().score).toBeGreaterThan(0);
  });

  it('requires Pac-Man world position to be centered on the point tile before consuming', () => {
    const { world, renderSystem, center } = createRenderHarness();

    world.pacman.moved.x = 0;
    world.pacman.moved.y = 0;
    world.pacman.x = center.x + 0.2;
    world.pacman.y = center.y;
    renderSystem.update(16);

    expect(getGameState().score).toBe(0);

    world.pacman.x = center.x;
    renderSystem.update(16);

    expect(getGameState().score).toBeGreaterThan(0);
  });

  it('starts pacman eat animation only when a point is actually consumed', () => {
    const { world, renderSystem, center } = createRenderHarness();

    world.pacman.moved.x = 0.1;
    world.pacman.x = center.x + 0.1;
    renderSystem.update(16);

    expect(world.pacmanAnimation.active).toBe(false);
    expect(getGameState().score).toBe(0);

    world.pacman.moved.x = 0;
    world.pacman.x = center.x;
    renderSystem.update(16);

    expect(world.pacmanAnimation.active).toBe(true);
    expect(world.pacmanAnimation.frame).toBe(0);
    expect(world.pacmanAnimation.sequenceIndex).toBe(0);
    expect(getGameState().score).toBeGreaterThan(0);
  });

  it('does not trigger pacman eat animation from movement when no point can be consumed', () => {
    const { world, renderSystem, center } = createRenderHarness({
      collisionRows: [[createCollisionTile()]],
      pacmanTile: { x: 0, y: 0 },
    });

    world.pacman.x = center.x + 1;
    world.pacman.moved.x = 1;

    renderSystem.update(16);

    expect(getGameState().score).toBe(0);
    expect(world.pacmanAnimation.active).toBe(false);
    expect(world.pacmanAnimation.frame).toBe(0);
  });

  it('consumes a point only when Pac-Man tile and centered world position overlap the same point tile', () => {
    const { world, renderSystem } = createRenderHarness({
      collisionRows: [[createCollisionTile({ collides: true }), createCollisionTile({ collides: true })]],
      pacmanTile: { x: 1, y: 0 },
    });

    const tileZeroCenter = toTileCenter({ x: 0, y: 0 });
    const tileOneCenter = toTileCenter({ x: 1, y: 0 });

    world.pacman.moved.x = 0;
    world.pacman.moved.y = 0;
    world.pacman.x = tileZeroCenter.x;
    world.pacman.y = tileZeroCenter.y;

    renderSystem.update(16);
    expect(getGameState().score).toBe(0);

    world.pacman.x = tileOneCenter.x;
    world.pacman.y = tileOneCenter.y;
    renderSystem.update(16);

    const consumedScore = getGameState().score;
    expect(consumedScore).toBeGreaterThan(0);

    renderSystem.update(16);
    expect(getGameState().score).toBe(consumedScore);
  });
});

describe('RenderSystem point rendering regression', () => {
  it('renders points on both colliding tiles and non-colliding connector tiles', () => {
    const pointImage = { id: 'point' } as unknown as HTMLImageElement;
    const collisionRows = [
      [
        createCollisionTile({ collides: true, left: true }),
        createCollisionTile(),
        createCollisionTile({ collides: true }),
        createCollisionTile({ collides: true, right: true }),
      ],
    ];

    const { map, collisionGrid } = createMapFixture(collisionRows);
    const world = createWorld(map, collisionGrid, { x: 0, y: 0 });

    const drawImageCentered = vi.fn();
    const renderer = {
      clear: vi.fn(),
      beginWorld: vi.fn(),
      endWorld: vi.fn(),
      drawImageCentered,
      drawSpriteFrame: vi.fn(),
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D,
    } as unknown as CanvasRendererAdapter;

    const assets = {
      getCollectibleImage: () => pointImage,
      getTileImage: () => null,
      getSpriteSheet: () => null,
    } as unknown as AssetCatalog;

    const renderSystem = new RenderSystem(world, renderer, {} as Camera2D, assets);
    renderSystem.render();

    const pointCalls = drawImageCentered.mock.calls.filter(([image]) => image === pointImage);

    const centers = pointCalls.map(([, x, y]) => `${x},${y}`);
    expect(pointCalls).toHaveLength(4);
    expect(centers).toEqual(['8,8', '24,8', '40,8', '56,8']);
  });

  it('renders one collectible per base point in the production maze before any consumption', () => {
    const pointImage = { id: 'point' } as unknown as HTMLImageElement;
    const { map, collisionGrid, startTile } = loadProductionMazeFixture();
    const world = createWorld(map, collisionGrid, startTile);

    const drawImageCentered = vi.fn();
    const renderer = {
      clear: vi.fn(),
      beginWorld: vi.fn(),
      endWorld: vi.fn(),
      drawImageCentered,
      drawSpriteFrame: vi.fn(),
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D,
    } as unknown as CanvasRendererAdapter;

    const assets = {
      getCollectibleImage: () => pointImage,
      getTileImage: () => null,
      getSpriteSheet: () => null,
    } as unknown as AssetCatalog;

    const renderSystem = new RenderSystem(world, renderer, {} as Camera2D, assets);
    renderSystem.render();

    const layout = buildPointLayout({
      map,
      collisionGrid,
      startTile,
      tileSize: map.tileWidth,
    });

    const pointCalls = drawImageCentered.mock.calls.filter(([image]) => image === pointImage);

    expect(pointCalls).toHaveLength(layout.basePoints.length);

    pointCalls.forEach(([, x, y]) => {
      expect(x).toBeGreaterThanOrEqual(map.tileWidth / 2);
      expect(x).toBeLessThanOrEqual(map.widthInPixels - map.tileWidth / 2);
      expect(y).toBeGreaterThanOrEqual(map.tileHeight / 2);
      expect(y).toBeLessThanOrEqual(map.heightInPixels - map.tileHeight / 2);
    });

    const nonCollidingBasePoint = layout.basePoints.find((tile) => !map.tiles[tile.y]?.[tile.x]?.collision.collides);
    expect(nonCollidingBasePoint).toBeDefined();

    const nonCollidingCenter = toTileCenter(nonCollidingBasePoint as { x: number; y: number }, map.tileWidth);
    const renderedPointCenters = new Set(pointCalls.map(([, x, y]) => `${x},${y}`));
    expect(renderedPointCenters.has(`${nonCollidingCenter.x},${nonCollidingCenter.y}`)).toBe(true);

    const forbiddenTiles = collectVoidBoundaryForbiddenTiles(map, collisionGrid, map.tileWidth);
    expect(forbiddenTiles).toEqual(
      expect.arrayContaining([
        { x: 2, y: 1 },
        { x: 48, y: 1 },
        { x: 1, y: 2 },
        { x: 49, y: 48 },
        { x: 2, y: 49 },
        { x: 48, y: 49 },
      ]),
    );

    const forbiddenCenters = forbiddenTiles.map((tile) => {
      const center = toTileCenter(tile, map.tileWidth);
      return `${center.x},${center.y}`;
    });

    expect(forbiddenCenters.some((center) => renderedPointCenters.has(center))).toBe(false);
  });
});

describe('RenderSystem draw order', () => {
  it('draws ghosts before jail foreground tiles so jail overlays ghost sprites', () => {
    const baseTileImage = { id: 'base' } as unknown as HTMLImageElement;
    const jailTileImage = { id: 'jail' } as unknown as HTMLImageElement;
    const ghostSheet = { id: 'ghost-sheet' } as unknown as ReturnType<AssetCatalog['getSpriteSheet']>;
    const pacmanSheet = { id: 'pacman-sheet' } as unknown as ReturnType<AssetCatalog['getSpriteSheet']>;

    const map: WorldMapData = {
      width: 2,
      height: 1,
      tileWidth: 16,
      tileHeight: 16,
      widthInPixels: 32,
      heightInPixels: 16,
      tiles: [
        [
          {
            x: 0,
            y: 0,
            rawGid: 1,
            gid: 1,
            localId: 1,
            imagePath: 'base.png',
            rotation: 0,
            flipX: false,
            flipY: false,
            collision: createCollisionTile(),
          },
          {
            x: 1,
            y: 0,
            rawGid: 17,
            gid: 17,
            localId: 16,
            imagePath: 'jail.png',
            rotation: 0,
            flipX: false,
            flipY: false,
            collision: createCollisionTile(),
          },
        ],
      ],
      collisionByGid: new Map([[1, createCollisionTile()], [17, createCollisionTile()]]),
      imageByGid: new Map([
        [1, 'base.png'],
        [17, 'jail.png'],
      ]),
      spawnObjects: [],
    };

    const ghost = new GhostEntity({
      key: 'inky',
      tile: { x: 0, y: 0 },
      direction: 'right',
      speed: 1,
      displayWidth: 11,
      displayHeight: 11,
    });
    ghost.x = 8;
    ghost.y = 8;

    const world = {
      map,
      tileSize: 16,
      collisionGrid: new CollisionGrid([[createCollisionTile(), createCollisionTile()]]),
      pacmanAnimation: {
        frame: 0,
        elapsedMs: 0,
        sequenceIndex: 0,
        active: false,
      },
      pacman: {
        tile: { x: 0, y: 0 },
        moved: { x: 0, y: 0 },
        x: 8,
        y: 8,
        displayWidth: 10,
        displayHeight: 10,
        angle: 0,
        flipX: false,
        flipY: false,
        portalBlinkRemainingMs: 0,
        portalBlinkElapsedMs: 0,
        deathRecoveryRemainingMs: 0,
        deathRecoveryElapsedMs: 0,
        deathRecoveryNextToggleAtMs: 0,
        deathRecoveryVisible: true,
      },
      ghosts: [ghost],
      ghostScaredRecovery: new Map(),
      ghostAnimations: new Map([
        [
          ghost,
          {
            key: 'inkyIdle',
            frame: 0,
            elapsedMs: 0,
            forward: 1,
          },
        ],
      ]),
    } as unknown as WorldState;

    const drawOrder: string[] = [];
    const renderer = {
      clear: vi.fn(),
      beginWorld: vi.fn(),
      endWorld: vi.fn(),
      drawImageCentered: vi.fn((image: unknown) => {
        if (image === baseTileImage) {
          drawOrder.push('base-tile');
        }
        if (image === jailTileImage) {
          drawOrder.push('jail-overlay');
        }
      }),
      drawSpriteFrame: vi.fn((sheet: unknown) => {
        if (sheet === ghostSheet) {
          drawOrder.push('ghost');
        }
        if (sheet === pacmanSheet) {
          drawOrder.push('pacman');
        }
      }),
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D,
    } as unknown as CanvasRendererAdapter;

    const assets = {
      getCollectibleImage: () => null,
      getTileImage: (path: string) => {
        if (path === 'base.png') {
          return baseTileImage;
        }

        if (path === 'jail.png') {
          return jailTileImage;
        }

        return undefined;
      },
      getSpriteSheet: (key: string) => {
        if (key === 'pacman') {
          return pacmanSheet;
        }

        if (key === 'inky') {
          return ghostSheet;
        }

        return undefined;
      },
    } as unknown as AssetCatalog;

    const renderSystem = new RenderSystem(world, renderer, {} as Camera2D, assets);
    renderSystem.render();

    expect(drawOrder).toEqual(['base-tile', 'ghost', 'jail-overlay', 'pacman']);
  });

  it('draws scared-to-base crossfade for ghosts with active scared recovery', () => {
    const map: WorldMapData = {
      width: 1,
      height: 1,
      tileWidth: 16,
      tileHeight: 16,
      widthInPixels: 16,
      heightInPixels: 16,
      tiles: [
        [
          {
            x: 0,
            y: 0,
            rawGid: 1,
            gid: 1,
            localId: 1,
            imagePath: 'base.png',
            rotation: 0,
            flipX: false,
            flipY: false,
            collision: createCollisionTile(),
          },
        ],
      ],
      collisionByGid: new Map([[1, createCollisionTile()]]),
      imageByGid: new Map([[1, 'base.png']]),
      spawnObjects: [],
    };

    const ghost = new GhostEntity({
      key: 'inky',
      tile: { x: 0, y: 0 },
      direction: 'right',
      speed: 1,
      displayWidth: 11,
      displayHeight: 11,
    });
    ghost.x = 8;
    ghost.y = 8;

    const world = {
      map,
      tileSize: 16,
      collisionGrid: new CollisionGrid([[createCollisionTile()]]),
      pacmanAnimation: { frame: 0, elapsedMs: 0, sequenceIndex: 0, active: false },
      pacman: {
        tile: { x: 0, y: 0 },
        moved: { x: 0, y: 0 },
        x: 8,
        y: 8,
        displayWidth: 10,
        displayHeight: 10,
        angle: 0,
        flipX: false,
        flipY: false,
        portalBlinkRemainingMs: 0,
        portalBlinkElapsedMs: 0,
        deathRecoveryRemainingMs: 0,
        deathRecoveryElapsedMs: 0,
        deathRecoveryNextToggleAtMs: 0,
        deathRecoveryVisible: true,
      },
      ghosts: [ghost],
      ghostScaredRecovery: new Map([[ghost, { elapsedMs: 450, durationMs: 900 }]]),
      ghostAnimations: new Map([
        [
          ghost,
          {
            key: 'inkyIdle',
            frame: 3,
            elapsedMs: 0,
            forward: 1,
          },
        ],
      ]),
    } as unknown as WorldState;

    const drawSpriteFrame = vi.fn();
    const renderer = {
      clear: vi.fn(),
      beginWorld: vi.fn(),
      endWorld: vi.fn(),
      drawImageCentered: vi.fn(),
      drawSpriteFrame,
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D,
    } as unknown as CanvasRendererAdapter;

    const scaredSheet = { id: 'scared-sheet' } as unknown as ReturnType<AssetCatalog['getSpriteSheet']>;
    const baseSheet = { id: 'base-sheet' } as unknown as ReturnType<AssetCatalog['getSpriteSheet']>;
    const pacmanSheet = { id: 'pacman-sheet' } as unknown as ReturnType<AssetCatalog['getSpriteSheet']>;
    const assets = {
      getCollectibleImage: () => null,
      getTileImage: () => null,
      getSpriteSheet: (key: string) => {
        if (key === 'scared') {
          return scaredSheet;
        }
        if (key === 'inky') {
          return baseSheet;
        }
        if (key === 'pacman') {
          return pacmanSheet;
        }
        return undefined;
      },
    } as unknown as AssetCatalog;

    const renderSystem = new RenderSystem(world, renderer, {} as Camera2D, assets);
    renderSystem.render();

    const drawCalls = drawSpriteFrame.mock.calls as Array<[unknown, ...unknown[]]>;
    expect(drawCalls.some(([sheet]) => sheet === scaredSheet)).toBe(true);
    expect(drawCalls.some(([sheet]) => sheet === baseSheet)).toBe(true);
  });

  it('keeps Pac-Man visible during death recovery even when portal blink phase would hide him', () => {
    const map: WorldMapData = {
      width: 1,
      height: 1,
      tileWidth: 16,
      tileHeight: 16,
      widthInPixels: 16,
      heightInPixels: 16,
      tiles: [
        [
          {
            x: 0,
            y: 0,
            rawGid: 1,
            gid: 1,
            localId: 1,
            imagePath: 'base.png',
            rotation: 0,
            flipX: false,
            flipY: false,
            collision: createCollisionTile(),
          },
        ],
      ],
      collisionByGid: new Map([[1, createCollisionTile()]]),
      imageByGid: new Map([[1, 'base.png']]),
      spawnObjects: [],
    };

    const world = {
      map,
      tileSize: 16,
      collisionGrid: new CollisionGrid([[createCollisionTile()]]),
      pacmanAnimation: { frame: 0, elapsedMs: 0, sequenceIndex: 0, active: false },
      pacman: {
        tile: { x: 0, y: 0 },
        moved: { x: 0, y: 0 },
        x: 8,
        y: 8,
        displayWidth: 10,
        displayHeight: 10,
        angle: 0,
        flipX: false,
        flipY: false,
        portalBlinkRemainingMs: 300,
        portalBlinkElapsedMs: 1300,
        deathRecoveryRemainingMs: 500,
        deathRecoveryElapsedMs: 700,
        deathRecoveryNextToggleAtMs: 0,
        deathRecoveryVisible: true,
      },
      ghosts: [],
      ghostScaredRecovery: new Map(),
      ghostAnimations: new Map(),
    } as unknown as WorldState;

    const drawSpriteFrame = vi.fn();
    const renderer = {
      clear: vi.fn(),
      beginWorld: vi.fn(),
      endWorld: vi.fn(),
      drawImageCentered: vi.fn(),
      drawSpriteFrame,
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D,
    } as unknown as CanvasRendererAdapter;

    const pacmanSheet = { id: 'pacman-sheet' } as unknown as ReturnType<AssetCatalog['getSpriteSheet']>;
    const assets = {
      getCollectibleImage: () => null,
      getTileImage: () => null,
      getSpriteSheet: (key: string) => (key === 'pacman' ? pacmanSheet : undefined),
    } as unknown as AssetCatalog;

    const renderSystem = new RenderSystem(world, renderer, {} as Camera2D, assets);
    renderSystem.render();

    expect(drawSpriteFrame).toHaveBeenCalledWith(
      pacmanSheet,
      0,
      8,
      8,
      10,
      10,
      0,
      false,
      false,
    );
  });
});
