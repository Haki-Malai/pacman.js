export type Direction = 'up' | 'down' | 'left' | 'right';
export type MovementActor = 'pacman' | 'ghost';

export interface MovementProgress {
  x: number;
  y: number;
}

export interface TilePosition {
  x: number;
  y: number;
}

export interface DirectionState {
  current: Direction;
  next: Direction;
}

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

export interface BufferedEntity {
  moved: MovementProgress;
  direction: DirectionState;
}

export interface GridEntity {
  tile: TilePosition;
}

export interface RenderableEntity {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  depth: number;
  active: boolean;
}

export type GhostAnimationState = 'default' | 'scared';

export type GhostKey = 'inky' | 'clyde' | 'pinky' | 'blinky';

export interface GhostState {
  free: boolean;
  soonFree: boolean;
  scared: boolean;
  dead: boolean;
  animation: GhostAnimationState;
}

export interface PacmanSprite extends RenderableEntity {
  moved: MovementProgress;
  direction: DirectionState;
  tile: TilePosition;
}

export interface GhostSprite extends RenderableEntity {
  moved: MovementProgress;
  key: GhostKey;
  state: GhostState;
  direction: Direction;
  speed: number;
  tile: TilePosition;
}

export interface MovableEntity {
  x: number;
  y: number;
  moved: MovementProgress;
  tile: TilePosition;
}
