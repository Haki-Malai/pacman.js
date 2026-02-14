import { canMove, getAvailableDirections } from '../../movement';
import { CollisionTile, CollisionTiles, Direction, TilePosition } from '../../types';

const createEmptyCollisionTile = (): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export interface GhostSimulationState {
  tile: TilePosition;
  moved: { x: number; y: number };
  direction: Direction;
}

export interface GhostSimulationConfig {
  collisionGrid: CollisionTile[][];
  steps: number;
  rng: () => number;
  tileSize: number;
  speed?: number;
  startTile: TilePosition;
  startDirection: Direction;
}

const getCollisionTileAt = (collisionGrid: CollisionTile[][], x: number, y: number): CollisionTile => {
  const row = collisionGrid[y];
  if (!row) {
    return createEmptyCollisionTile();
  }
  return row[x] ?? createEmptyCollisionTile();
};

const getCollisionTilesAt = (collisionGrid: CollisionTile[][], tile: TilePosition): CollisionTiles => ({
  current: getCollisionTileAt(collisionGrid, tile.x, tile.y),
  up: getCollisionTileAt(collisionGrid, tile.x, tile.y - 1),
  down: getCollisionTileAt(collisionGrid, tile.x, tile.y + 1),
  left: getCollisionTileAt(collisionGrid, tile.x - 1, tile.y),
  right: getCollisionTileAt(collisionGrid, tile.x + 1, tile.y),
});

const advance = (state: GhostSimulationState, direction: Direction, speed: number, tileSize: number): void => {
  const delta = DIRECTION_VECTORS[direction];
  state.moved.x += delta.dx * speed;
  state.moved.y += delta.dy * speed;

  while (state.moved.x >= tileSize) {
    state.tile.x += 1;
    state.moved.x -= tileSize;
  }

  while (state.moved.x <= -tileSize) {
    state.tile.x -= 1;
    state.moved.x += tileSize;
  }

  while (state.moved.y >= tileSize) {
    state.tile.y += 1;
    state.moved.y -= tileSize;
  }

  while (state.moved.y <= -tileSize) {
    state.tile.y -= 1;
    state.moved.y += tileSize;
  }
};

export function simulateGhostMovement(config: GhostSimulationConfig): GhostSimulationState[] {
  const speed = config.speed ?? 1;
  const state: GhostSimulationState = {
    tile: { ...config.startTile },
    moved: { x: 0, y: 0 },
    direction: config.startDirection,
  };

  const snapshots: GhostSimulationState[] = [];

  for (let step = 0; step < config.steps; step += 1) {
    const collisionTiles = getCollisionTilesAt(config.collisionGrid, state.tile);

    const canMoveCurrent = canMove(state.direction, state.moved.y, state.moved.x, collisionTiles, config.tileSize, 'ghost');

    if (canMoveCurrent) {
      if (state.moved.x === 0 && state.moved.y === 0) {
        const options = getAvailableDirections(collisionTiles, state.direction, config.tileSize, 'ghost');
        if (options.length > 0) {
          state.direction = options[Math.floor(config.rng() * options.length)] ?? state.direction;
        }
      }
      advance(state, state.direction, speed, config.tileSize);
    } else if (state.moved.x === 0 && state.moved.y === 0) {
      const perpendicular: Direction[] =
        state.direction === 'left' || state.direction === 'right' ? ['up', 'down'] : ['left', 'right'];
      const options = perpendicular.filter((direction) =>
        canMove(direction, state.moved.y, state.moved.x, collisionTiles, config.tileSize, 'ghost'),
      );

      if (options.length > 0) {
        state.direction = options[Math.floor(config.rng() * options.length)] ?? state.direction;
      } else {
        const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const fallback = opposites[state.direction];
        if (canMove(fallback, state.moved.y, state.moved.x, collisionTiles, config.tileSize, 'ghost')) {
          state.direction = fallback;
        }
      }
    }

    snapshots.push({
      tile: { ...state.tile },
      moved: { ...state.moved },
      direction: state.direction,
    });
  }

  return snapshots;
}
