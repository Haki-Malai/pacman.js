import { describe, expect, it } from 'vitest';
import { SPEED, SPRITE_SIZE, TILE_SIZE } from '../config/constants';
import { GhostEntity } from '../game/domain/entities/GhostEntity';
import { PacmanEntity } from '../game/domain/entities/PacmanEntity';
import { GhostDecisionService } from '../game/domain/services/GhostDecisionService';
import { MovementRules } from '../game/domain/services/MovementRules';
import { PortalService } from '../game/domain/services/PortalService';
import { setGhostScaredWindow } from '../game/domain/services/GhostScaredStateService';
import { CollisionGrid, CollisionTile } from '../game/domain/world/CollisionGrid';
import { WorldMapData, WorldState, WorldTile } from '../game/domain/world/WorldState';
import { SeededRandom } from '../game/shared/random/SeededRandom';
import { AnimationSystem } from '../game/systems/AnimationSystem';
import { GhostMovementSystem } from '../game/systems/GhostMovementSystem';
import { openTile, wallTile } from './fixtures/collisionFixtures';

const STEP_MS = 1000 / 60;

function createMapFixture(collisionRows: CollisionTile[][]): { map: WorldMapData; collisionGrid: CollisionGrid } {
  const width = collisionRows[0]?.length ?? 0;
  const height = collisionRows.length;
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
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    widthInPixels: width * TILE_SIZE,
    heightInPixels: height * TILE_SIZE,
    tiles,
    collisionByGid: new Map([[1, openTile()]]),
    imageByGid: new Map([[1, 'tile.png']]),
    spawnObjects: [],
  };

  return {
    map,
    collisionGrid: new CollisionGrid(collisionRows.map((row) => row.map((tile) => ({ ...tile })))),
  };
}

describe('ghost scared speed recovery', () => {
  it('defers free-ghost speed restore until tile-center realignment and keeps blocked wall non-penetration', () => {
    const collisionRows: CollisionTile[][] = [
      [wallTile(), wallTile(), wallTile(), wallTile(), wallTile()],
      [wallTile(), openTile(), openTile({ right: true }), wallTile({ left: true }), wallTile()],
      [wallTile(), wallTile(), wallTile(), wallTile(), wallTile()],
    ];
    const { map, collisionGrid } = createMapFixture(collisionRows);
    const movementRules = new MovementRules(TILE_SIZE);

    const pacman = new PacmanEntity({ x: 1, y: 1 }, SPRITE_SIZE.pacman, SPRITE_SIZE.pacman);
    movementRules.setEntityTile(pacman, { x: 1, y: 1 });

    const ghost = new GhostEntity({
      key: 'inky',
      tile: { x: 1, y: 1 },
      direction: 'right',
      speed: SPEED.ghost,
      displayWidth: SPRITE_SIZE.ghost,
      displayHeight: SPRITE_SIZE.ghost,
    });
    movementRules.setEntityTile(ghost, { x: 1, y: 1 });
    ghost.state.free = true;
    ghost.state.soonFree = false;

    const world = new WorldState({
      map,
      tileSize: TILE_SIZE,
      collisionGrid,
      pacmanSpawnTile: { x: 1, y: 1 },
      pacman,
      ghosts: [ghost],
      ghostJailBounds: { minX: 1, maxX: 3, y: 1 },
    });

    const ghostMovement = new GhostMovementSystem(
      world,
      movementRules,
      new GhostDecisionService(),
      new PortalService(collisionGrid, []),
      new SeededRandom(20260302),
    );
    const animationSystem = new AnimationSystem(world, SPEED.ghost);

    animationSystem.start();
    setGhostScaredWindow(world, ghost, 1);
    animationSystem.update(0);
    expect(ghost.speed).toBe(0.5);

    ghostMovement.update();
    animationSystem.update(STEP_MS);

    expect(ghost.state.scared).toBe(false);
    expect(ghost.moved.x).toBe(0.5);
    expect(ghost.speed).toBe(0.5);

    let reachedRestorePoint = false;
    let maxGhostTileX = ghost.tile.x;
    for (let i = 0; i < 80; i += 1) {
      ghostMovement.update();
      animationSystem.update(STEP_MS);
      maxGhostTileX = Math.max(maxGhostTileX, ghost.tile.x);

      if (ghost.speed === SPEED.ghost) {
        expect(ghost.moved.x).toBe(0);
        expect(ghost.moved.y).toBe(0);
        reachedRestorePoint = true;
        break;
      }
    }

    expect(reachedRestorePoint).toBe(true);
    expect(maxGhostTileX).toBeLessThanOrEqual(2);
    expect(ghost.tile.x).not.toBe(3);
  });
});
