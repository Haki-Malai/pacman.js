import { Direction } from '../valueObjects/Direction';
import { MovementProgress } from '../valueObjects/MovementProgress';
import { TilePosition } from '../valueObjects/TilePosition';

export interface DirectionState {
  current: Direction;
  next: Direction;
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

export class PacmanEntity implements RenderableEntity {
  x = 0;
  y = 0;
  displayWidth: number;
  displayHeight: number;
  angle = 0;
  flipX = false;
  flipY = false;
  depth = 2;
  active = true;
  moved: MovementProgress = { x: 0, y: 0 };
  direction: DirectionState = { current: 'right', next: 'right' };
  tile: TilePosition;

  constructor(tile: TilePosition, displayWidth: number, displayHeight: number) {
    this.tile = { ...tile };
    this.displayWidth = displayWidth;
    this.displayHeight = displayHeight;
  }
}
