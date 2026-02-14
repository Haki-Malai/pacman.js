import { TilePosition } from '../valueObjects/TilePosition';

export interface CollisionTile {
  collides: boolean;
  penGate: boolean;
  portal: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type CollisionTiles = Record<'current' | 'up' | 'down' | 'left' | 'right', CollisionTile>;

export const createEmptyCollisionTile = (): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

export class CollisionGrid {
  readonly width: number;
  readonly height: number;

  constructor(private readonly grid: CollisionTile[][]) {
    this.height = grid.length;
    this.width = grid[0]?.length ?? 0;
  }

  getTileAt(x: number, y: number): CollisionTile {
    const row = this.grid[y];
    if (!row) {
      return createEmptyCollisionTile();
    }
    return row[x] ?? createEmptyCollisionTile();
  }

  getTilesAt(tile: TilePosition): CollisionTiles {
    const { x, y } = tile;
    return {
      current: this.getTileAt(x, y),
      up: this.getTileAt(x, y - 1),
      down: this.getTileAt(x, y + 1),
      left: this.getTileAt(x - 1, y),
      right: this.getTileAt(x + 1, y),
    };
  }

  toArray(): CollisionTile[][] {
    return this.grid.map((row) => row.map((tile) => ({ ...tile })));
  }
}
