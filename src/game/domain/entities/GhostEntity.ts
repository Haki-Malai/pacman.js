import { Direction } from '../valueObjects/Direction';
import { MovementProgress } from '../valueObjects/MovementProgress';
import { TilePosition } from '../valueObjects/TilePosition';
import { RenderableEntity } from './PacmanEntity';

export type GhostAnimationState = 'default' | 'scared';

export type GhostKey = 'inky' | 'clyde' | 'pinky' | 'blinky';

export interface GhostState {
  free: boolean;
  soonFree: boolean;
  scared: boolean;
  dead: boolean;
  animation: GhostAnimationState;
}

export class GhostEntity implements RenderableEntity {
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
  key: GhostKey;
  state: GhostState;
  direction: Direction;
  speed: number;
  tile: TilePosition;

  constructor(params: {
    key: GhostKey;
    tile: TilePosition;
    direction: Direction;
    speed: number;
    displayWidth: number;
    displayHeight: number;
  }) {
    this.key = params.key;
    this.direction = params.direction;
    this.speed = params.speed;
    this.tile = { ...params.tile };
    this.displayWidth = params.displayWidth;
    this.displayHeight = params.displayHeight;
    this.state = {
      free: false,
      soonFree: true,
      scared: false,
      dead: false,
      animation: 'default',
    };
  }
}
