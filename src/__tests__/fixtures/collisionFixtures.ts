import { CollisionGrid, CollisionTile } from '../../game/domain/world/CollisionGrid';

export function openTile(overrides: Partial<CollisionTile> = {}): CollisionTile {
  return {
    collides: false,
    penGate: false,
    portal: false,
    up: false,
    down: false,
    left: false,
    right: false,
    ...overrides,
  };
}

export function wallTile(overrides: Partial<CollisionTile> = {}): CollisionTile {
  return {
    collides: true,
    penGate: false,
    portal: false,
    up: true,
    down: true,
    left: true,
    right: true,
    ...overrides,
  };
}

export function createPortalPairGrid(): CollisionGrid {
  return new CollisionGrid([
    [openTile(), openTile(), openTile(), openTile(), openTile()],
    [openTile({ portal: true }), openTile(), openTile(), openTile(), openTile({ portal: true })],
    [openTile(), openTile(), openTile(), openTile(), openTile()],
  ]);
}

export function createBlockedPortalGrid(): CollisionGrid {
  return new CollisionGrid([
    [openTile(), openTile(), openTile(), openTile(), openTile()],
    [openTile({ portal: true }), openTile(), openTile(), openTile(), wallTile({ portal: true })],
    [openTile(), openTile(), openTile(), openTile(), openTile()],
  ]);
}

export function createPenGateGrid(): CollisionGrid {
  return new CollisionGrid([
    [openTile(), openTile(), openTile()],
    [openTile({ down: true, penGate: true }), openTile(), openTile()],
    [openTile(), openTile(), openTile()],
  ]);
}

export function createSimulationGrid(size: number): CollisionTile[][] {
  const grid: CollisionTile[][] = [];

  for (let y = 0; y < size; y += 1) {
    const row: CollisionTile[] = [];
    for (let x = 0; x < size; x += 1) {
      const isBorder = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      row.push(isBorder ? wallTile() : openTile());
    }
    grid.push(row);
  }

  return grid;
}
