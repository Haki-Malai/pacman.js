export type Direction = 'up' | 'down' | 'left' | 'right';

export type MovementActor = 'pacman' | 'ghost';

export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
