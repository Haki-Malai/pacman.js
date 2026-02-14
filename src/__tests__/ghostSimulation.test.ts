import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../game/startGameApp';
import { simulateGhostMovement } from '../game/runtime/ghostSimulation';
import { CollisionTile } from '../types';

const passableTile = (): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

const wallTile = (): CollisionTile => ({
  collides: true,
  penGate: false,
  portal: false,
  up: true,
  down: true,
  left: true,
  right: true,
});

const createSimulationGrid = (size: number): CollisionTile[][] => {
  const grid: CollisionTile[][] = [];
  for (let y = 0; y < size; y += 1) {
    const row: CollisionTile[] = [];
    for (let x = 0; x < size; x += 1) {
      const isBorder = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      row.push(isBorder ? wallTile() : passableTile());
    }
    grid.push(row);
  }
  return grid;
};

describe('simulateGhostMovement', () => {
  it('produces deterministic movement when seeded RNG is injected', () => {
    const grid = createSimulationGrid(9);

    const runA = simulateGhostMovement({
      collisionGrid: grid,
      steps: 120,
      rng: createSeededRng(12345),
      tileSize: 16,
      startTile: { x: 4, y: 4 },
      startDirection: 'left',
    });

    const runB = simulateGhostMovement({
      collisionGrid: grid,
      steps: 120,
      rng: createSeededRng(12345),
      tileSize: 16,
      startTile: { x: 4, y: 4 },
      startDirection: 'left',
    });

    const runC = simulateGhostMovement({
      collisionGrid: grid,
      steps: 120,
      rng: createSeededRng(99999),
      tileSize: 16,
      startTile: { x: 4, y: 4 },
      startDirection: 'left',
    });

    expect(runA).toEqual(runB);
    expect(runA).not.toEqual(runC);
  });
});
