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

export interface PortalPair {
  from: TilePosition;
  to: TilePosition;
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
  portalPairs?: PortalPair[];
  spawnObjects: WorldObject[];
  collectibleObjects?: WorldObject[];
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

export interface GhostScaredWarningVisualState {
  elapsedMs: number;
  nextToggleAtMs: number;
  showBaseColor: boolean;
}

export interface PacmanAnimationPlayback {
  frame: number;
  elapsedMs: number;
  sequenceIndex: number;
  active: boolean;
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
  readonly pacmanSpawnTile: TilePosition;
  pacman: PacmanEntity;
  ghosts: GhostEntity[];
  ghostScaredTimers = new Map<GhostEntity, number>();
  ghostScaredWarnings = new Map<GhostEntity, GhostScaredWarningVisualState>();
  ghostJailBounds: GhostJailBounds;
  readonly ghostJailReturnTile: TilePosition;
  ghostEatChainCount = 0;
  ghostsExitingJail = new Set<GhostEntity>();
  ghostAnimations = new Map<GhostEntity, AnimationPlayback>();
  pacmanAnimation: PacmanAnimationPlayback = {
    frame: 0,
    elapsedMs: 0,
    sequenceIndex: 0,
    active: false,
  };
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
    pacmanSpawnTile: TilePosition;
    pacman: PacmanEntity;
    ghosts: GhostEntity[];
    ghostJailBounds: GhostJailBounds;
  }) {
    this.map = params.map;
    this.tileSize = params.tileSize;
    this.collisionGrid = params.collisionGrid;
    this.pacmanSpawnTile = { ...params.pacmanSpawnTile };
    this.pacman = params.pacman;
    this.ghosts = params.ghosts;
    this.ghostJailBounds = params.ghostJailBounds;
    this.ghostJailReturnTile = {
      x: params.ghostJailBounds.minX + Math.floor((params.ghostJailBounds.maxX - params.ghostJailBounds.minX) / 2),
      y: params.ghostJailBounds.y,
    };
  }

  nextTick(): number {
    this.tick += 1;
    return this.tick;
  }
}
