import Phaser from 'phaser';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MovementProgress {
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

export type GhostAnimationState = 'default' | 'scared';

export type GhostKey = 'inky' | 'clyde' | 'pinky' | 'blinky';

export interface GhostState {
  free: boolean;
  soonFree: boolean;
  scared: boolean;
  dead: boolean;
  animation: GhostAnimationState;
}

export interface PacmanSprite extends Phaser.Physics.Arcade.Sprite {
  moved: MovementProgress;
  direction: DirectionState;
}

export type GhostSprite = Omit<Phaser.Physics.Arcade.Sprite, 'state'> & {
  moved: MovementProgress;
  key: GhostKey;
  state: GhostState;
  direction: Direction;
  speed: number;
};

export interface MovableEntity {
  x: number;
  y: number;
  moved: MovementProgress;
}
