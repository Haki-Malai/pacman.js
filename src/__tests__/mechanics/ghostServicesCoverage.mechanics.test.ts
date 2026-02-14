import { describe, expect, it } from 'vitest';
import { GhostEntity } from '../../game/domain/entities/GhostEntity';
import { GhostDecisionService, simulateGhostMovement } from '../../game/domain/services/GhostDecisionService';
import { GhostJailService, getObjectNumberProperty } from '../../game/domain/services/GhostJailService';
import { MovementRules } from '../../game/domain/services/MovementRules';
import { CollisionGrid, CollisionTile } from '../../game/domain/world/CollisionGrid';
import { WorldMapData } from '../../game/domain/world/WorldState';
import { SeededRandom } from '../../game/shared/random/SeededRandom';
import { createSimulationGrid, openTile, wallTile } from '../fixtures/collisionFixtures';

const TILE_SIZE = 16;

function makeMap(grid: CollisionTile[][], ghostHome?: WorldMapData['ghostHome']): WorldMapData {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const defaultGhostHome =
    ghostHome ??
    ({
      type: 'ghost-home',
      y: 48,
      properties: [
        { name: 'startX', value: 1 },
        { name: 'endX', value: 3 },
        { name: 'gridY', value: 3 },
        { name: 'ghostCount', value: 1 },
      ],
    } as const);

  return {
    width,
    height,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    widthInPixels: width * TILE_SIZE,
    heightInPixels: height * TILE_SIZE,
    tiles: grid.map((row, y) =>
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
    ),
    collisionByGid: new Map(),
    imageByGid: new Map(),
    spawnObjects: [],
    pacmanSpawn: {
      type: 'pacman',
      properties: [
        { name: 'gridX', value: 2 },
        { name: 'gridY', value: 2 },
      ],
    },
    ghostHome: defaultGhostHome,
  };
}

function rngWith(values: number[]) {
  let index = 0;
  return {
    next: () => {
      const value = values[index % values.length] ?? 0;
      index += 1;
      return value;
    },
    int: (maxExclusive: number) => {
      if (maxExclusive <= 0) {
        return 0;
      }
      const value = values[index % values.length] ?? 0;
      index += 1;
      return Math.floor(value * maxExclusive) % maxExclusive;
    },
  };
}

describe('ghost decision service coverage', () => {
  it('covers center and blocked direction fallbacks', () => {
    const service = new GhostDecisionService();

    const blockedAll = {
      current: openTile({ up: true, down: true, left: true, right: true }),
      up: openTile({ down: true }),
      down: openTile({ up: true }),
      left: openTile({ right: true }),
      right: openTile({ left: true }),
    };

    expect(service.chooseDirectionAtCenter('up', blockedAll, TILE_SIZE, rngWith([0.5]))).toBe('up');
    expect(service.chooseDirectionWhenBlocked('up', 0, 0, blockedAll, TILE_SIZE, rngWith([0.5]))).toBe('up');

    const fallbackOnly = {
      current: openTile({ up: true, left: true, right: true, down: false }),
      up: openTile({ down: true }),
      down: openTile({ up: false }),
      left: openTile({ right: true }),
      right: openTile({ left: true }),
    };

    expect(service.chooseDirectionWhenBlocked('up', 0, 0, fallbackOnly, TILE_SIZE, rngWith([0.5]))).toBe('down');

    const outOfRangeRng = {
      next: () => 0,
      int: () => 99,
    };

    expect(
      service.chooseDirectionAtCenter(
        'up',
        {
          current: openTile(),
          up: openTile(),
          down: openTile(),
          left: openTile(),
          right: openTile(),
        },
        TILE_SIZE,
        outOfRangeRng,
      ),
    ).toBe('up');

    expect(
      service.chooseDirectionWhenBlocked(
        'right',
        0,
        0,
        {
          current: openTile({ right: true, up: false, down: true, left: true }),
          up: openTile({ down: false }),
          down: openTile({ up: true }),
          left: openTile({ right: true }),
          right: openTile({ left: true }),
        },
        TILE_SIZE,
        outOfRangeRng,
      ),
    ).toBe('right');
  });

  it('covers simulateGhostMovement for array and CollisionGrid inputs', () => {
    const gridArray = createSimulationGrid(7);
    const gridObject = new CollisionGrid(gridArray);

    const arrayRun = simulateGhostMovement({
      collisionGrid: gridArray,
      steps: 20,
      rng: new SeededRandom(101),
      tileSize: TILE_SIZE,
      startTile: { x: 3, y: 3 },
      startDirection: 'left',
      speed: 2,
    });

    const objectRun = simulateGhostMovement({
      collisionGrid: gridObject,
      steps: 20,
      rng: new SeededRandom(101),
      tileSize: TILE_SIZE,
      startTile: { x: 3, y: 3 },
      startDirection: 'left',
      speed: 2,
    });

    expect(arrayRun).toEqual(objectRun);
    expect(arrayRun.length).toBe(20);
  });

  it('covers blocked-at-center branch in simulation', () => {
    const grid = new CollisionGrid([
      [wallTile(), wallTile(), wallTile()],
      [wallTile(), openTile({ left: true }), openTile()],
      [wallTile(), wallTile(), wallTile()],
    ]);

    const run = simulateGhostMovement({
      collisionGrid: grid,
      steps: 1,
      rng: new SeededRandom(5),
      tileSize: TILE_SIZE,
      startTile: { x: 1, y: 1 },
      startDirection: 'left',
    });

    expect(run[0]?.direction).not.toBe('left');
  });
});

describe('ghost jail service coverage', () => {
  it('covers spawn resolution branches and numeric property helper', () => {
    const service = new GhostJailService();
    const map = makeMap([
      [openTile(), openTile(), openTile(), openTile(), openTile()],
      [openTile(), openTile(), openTile(), openTile(), openTile()],
      [openTile(), openTile(), openTile(), openTile(), openTile()],
      [openTile(), openTile(), openTile(), openTile(), openTile()],
      [openTile(), openTile(), openTile(), openTile(), openTile()],
    ]);

    expect(getObjectNumberProperty(undefined, 'gridX')).toBeUndefined();
    expect(getObjectNumberProperty({ properties: [{ name: 'gridX', value: 'nope' }] }, 'gridX')).toBeUndefined();

    const fromGrid = service.resolveSpawnTile(
      {
        properties: [
          { name: 'gridX', value: 2 },
          { name: 'gridY', value: 3 },
        ],
      },
      { x: 0, y: 0 },
      map,
    );

    const fromPixels = service.resolveSpawnTile(
      {
        x: 70,
        y: 50,
      },
      { x: 0, y: 0 },
      map,
    );

    const fromFallback = service.resolveSpawnTile(undefined, { x: -1, y: 99 }, map);

    expect(fromGrid).toEqual({ x: 2, y: 3 });
    expect(fromPixels).toEqual({ x: 4, y: 3 });
    expect(fromFallback).toEqual({ x: 0, y: 4 });
  });

  it('covers jail bounds resolution branches', () => {
    const service = new GhostJailService();

    const mapWithGridY = makeMap(
      Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => openTile())),
      {
        type: 'ghost-home',
        properties: [
          { name: 'startX', value: 4 },
          { name: 'endX', value: 1 },
          { name: 'gridY', value: 2 },
        ],
      },
    );

    const mapWithPixelY = makeMap(
      Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => openTile())),
      {
        type: 'ghost-home',
        y: 48,
        properties: [
          { name: 'startX', value: 1 },
          { name: 'endX', value: 3 },
        ],
      },
    );

    const mapFallback = makeMap(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => openTile())), undefined);
    mapFallback.ghostHome = undefined;

    expect(service.resolveGhostJailBounds(mapWithGridY, { x: 2, y: 1 })).toEqual({ minX: 1, maxX: 4, y: 2 });
    expect(service.resolveGhostJailBounds(mapWithPixelY, { x: 2, y: 1 })).toEqual({ minX: 1, maxX: 3, y: 3 });
    expect(service.resolveGhostJailBounds(mapFallback, { x: 2, y: 1 })).toEqual({ minX: 2, maxX: 2, y: 1 });
  });

  it('covers release tile candidate selection branches', () => {
    const service = new GhostJailService();
    const movementRules = new MovementRules(TILE_SIZE);

    const openGrid = new CollisionGrid(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => openTile())));
    const blockedGrid = new CollisionGrid(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => wallTile())));

    const map = makeMap(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => openTile())));

    const noCandidates = service.findReleaseTile({
      currentTile: { x: -2, y: 4 },
      avoidTile: { x: 2, y: 2 },
      bounds: { minX: 1, maxX: 3, y: 3 },
      map,
      collisionGrid: blockedGrid,
      movementRules,
      rng: rngWith([0.2]),
    });

    const nearbyCandidates = service.findReleaseTile({
      currentTile: { x: 2, y: 4 },
      avoidTile: { x: 2, y: 2 },
      bounds: { minX: 1, maxX: 3, y: 3 },
      map,
      collisionGrid: openGrid,
      movementRules,
      rng: rngWith([0.1]),
    });

    const customGridRows = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => wallTile()));
    customGridRows[2][0] = openTile();
    customGridRows[2][4] = openTile();
    const nearestGrid = new CollisionGrid(customGridRows);

    const nearestCandidates = service.findReleaseTile({
      currentTile: { x: 2, y: 4 },
      avoidTile: { x: 99, y: 99 },
      bounds: { minX: 0, maxX: 4, y: 3 },
      map,
      collisionGrid: nearestGrid,
      movementRules,
      rng: rngWith([0.8]),
    });

    expect(noCandidates).toEqual({ x: 0, y: 2 });
    expect(nearbyCandidates.y).toBe(2);
    expect([1, 3]).toContain(nearbyCandidates.x);
    expect(nearestCandidates.y).toBe(2);
    expect([0, 4]).toContain(nearestCandidates.x);
  });

  it('covers moveGhostInJail direction initialization, edge bounce, and clamping', () => {
    const service = new GhostJailService();
    const rules = new MovementRules(TILE_SIZE);
    const ghost = new GhostEntity({
      key: 'inky',
      tile: { x: 1, y: 0 },
      direction: 'up',
      speed: 1,
      displayWidth: 10,
      displayHeight: 10,
    });

    rules.setEntityTile(ghost, { x: 1, y: 0 });
    ghost.moved.y = 1;

    service.moveGhostInJail(ghost, { minX: 1, maxX: 2, y: 2 }, rules, rngWith([0.2]), 1);
    expect(ghost.tile.y).toBe(2);
    expect(['left', 'right']).toContain(ghost.direction);

    ghost.direction = 'right';
    rules.setEntityTile(ghost, { x: 2, y: 2 });
    ghost.moved.x = 1;
    service.moveGhostInJail(ghost, { minX: 1, maxX: 2, y: 2 }, rules, rngWith([0.2]), TILE_SIZE + 4);

    expect(ghost.tile.x).toBe(2);
    expect(ghost.direction).toBe('left');
  });
});
