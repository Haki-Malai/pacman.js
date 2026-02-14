import { GhostEntity } from '../entities/GhostEntity';
import { PacmanEntity } from '../entities/PacmanEntity';
import { MovementProgress } from '../valueObjects/MovementProgress';
import { TilePosition } from '../valueObjects/TilePosition';
import { CollisionGrid, CollisionTile } from './CollisionGrid';

export interface WorldProperty {
  name: string;
  type?: string;
  value: unknown;
}

export interface WorldObject {
  id?: number;
  name?: string;
  type?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: WorldProperty[];
}

export interface WorldTile {
  x: number;
  y: number;
  rawGid: number;
  gid: number | null;
  localId: number | null;
  imagePath: string;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  collision: CollisionTile;
}

export interface WorldMapData {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  widthInPixels: number;
  heightInPixels: number;
  tiles: WorldTile[][];
  collisionByGid: Map<number, CollisionTile>;
  imageByGid: Map<number, string>;
  spawnObjects: WorldObject[];
  pacmanSpawn?: WorldObject;
  ghostHome?: WorldObject;
}

export type AnimationKey = 'scaredIdle' | 'inkyIdle' | 'clydeIdle' | 'pinkyIdle' | 'blinkyIdle';

export interface AnimationPlayback {
  key: AnimationKey;
  frame: number;
  elapsedMs: number;
  forward: 1 | -1;
}

export interface GhostJailBounds {
  minX: number;
  maxX: number;
  y: number;
}

export interface ScreenPointerState {
  x: number;
  y: number;
}

export interface MovableEntity {
  x: number;
  y: number;
  moved: MovementProgress;
  tile: TilePosition;
}

export class WorldState {
  readonly map: WorldMapData;
  readonly tileSize: number;
  readonly collisionGrid: CollisionGrid;
  pacman: PacmanEntity;
  ghosts: GhostEntity[];
  ghostJailBounds: GhostJailBounds;
  ghostsExitingJail = new Set<GhostEntity>();
  ghostAnimations = new Map<GhostEntity, AnimationPlayback>();
  isMoving = true;
  collisionDebugEnabled = false;
  hoveredDebugTile: TilePosition | null = null;
  pointerScreen: ScreenPointerState | null = null;
  debugPanelText = '';
  tick = 0;

  constructor(params: {
    map: WorldMapData;
    tileSize: number;
    collisionGrid: CollisionGrid;
    pacman: PacmanEntity;
    ghosts: GhostEntity[];
    ghostJailBounds: GhostJailBounds;
  }) {
    this.map = params.map;
    this.tileSize = params.tileSize;
    this.collisionGrid = params.collisionGrid;
    this.pacman = params.pacman;
    this.ghosts = params.ghosts;
    this.ghostJailBounds = params.ghostJailBounds;
  }

  nextTick(): number {
    this.tick += 1;
    return this.tick;
  }
}
