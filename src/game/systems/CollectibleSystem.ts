import { COLLECTIBLE_CONFIG } from '../../config/constants';
import { addScore } from '../../state/gameState';
import { buildPointLayout } from '../domain/services/PointLayoutService';
import { TilePosition } from '../domain/valueObjects/TilePosition';
import { WorldState } from '../domain/world/WorldState';

const BASE_POINT_SIZE = COLLECTIBLE_CONFIG[0].size;
const POWER_POINT_SIZE = COLLECTIBLE_CONFIG[1].size;
const EAT_EFFECT_DURATION_MS = 96;
const EAT_EFFECT_SCALE_MULTIPLIER = 1.5;
const POINT_CONSUME_MOVEMENT_EPSILON = 0.001;
const POINT_CONSUME_POSITION_EPSILON = 0.01;

export type CollectibleKind = 'base' | 'power';

export interface CollectiblePoint {
  tile: TilePosition;
  x: number;
  y: number;
  kind: CollectibleKind;
}

export interface EatEffect {
  x: number;
  y: number;
  elapsedMs: number;
  durationMs: number;
  sizeStart: number;
  sizeEnd: number;
}

function tileKey(tile: TilePosition): string {
  return `${tile.x},${tile.y}`;
}

export class CollectibleSystem {
  private readonly pointsByTile = new Map<string, CollectiblePoint>();
  private readonly eatEffects: EatEffect[] = [];

  constructor(private readonly world: WorldState) {
    const pointLayout = buildPointLayout({
      map: this.world.map,
      collisionGrid: this.world.collisionGrid,
      startTile: this.world.pacman.tile,
      tileSize: this.world.tileSize,
    });

    const powerTiles = new Set(pointLayout.powerPoints.map((tile) => tileKey(tile)));

    pointLayout.basePoints.forEach((tile) => {
      const key = tileKey(tile);
      const center = this.toPointCenter(tile);
      const kind: CollectibleKind = powerTiles.has(key) ? 'power' : 'base';

      this.pointsByTile.set(key, {
        tile,
        x: center.x,
        y: center.y,
        kind,
      });
    });
  }

  update(deltaMs: number): void {
    this.consumePointAtPacmanTile();
    this.updateEatEffects(deltaMs);
  }

  getPoints(): Iterable<CollectiblePoint> {
    return this.pointsByTile.values();
  }

  getEatEffects(): readonly EatEffect[] {
    return this.eatEffects;
  }

  private consumePointAtPacmanTile(): void {
    const currentTile = { x: this.world.pacman.tile.x, y: this.world.pacman.tile.y };
    const key = tileKey(currentTile);
    const point = this.pointsByTile.get(key);
    if (!point || !this.isPacmanCenteredOnPoint(point)) {
      return;
    }

    this.pointsByTile.delete(key);

    const scoreDelta = point.kind === 'power' ? COLLECTIBLE_CONFIG[1].score : COLLECTIBLE_CONFIG[0].score;
    addScore(scoreDelta);
    this.triggerPacmanEatAnimation();

    const baseSize = point.kind === 'power' ? POWER_POINT_SIZE : BASE_POINT_SIZE;
    this.eatEffects.push({
      x: point.x,
      y: point.y,
      elapsedMs: 0,
      durationMs: EAT_EFFECT_DURATION_MS,
      sizeStart: baseSize,
      sizeEnd: baseSize * EAT_EFFECT_SCALE_MULTIPLIER,
    });
  }

  private triggerPacmanEatAnimation(): void {
    const playback = this.world.pacmanAnimation;
    playback.active = true;
    playback.frame = 0;
    playback.elapsedMs = 0;
    playback.sequenceIndex = 0;
  }

  private isPacmanCenteredOnPoint(point: CollectiblePoint): boolean {
    if (
      Math.abs(this.world.pacman.moved.x) > POINT_CONSUME_MOVEMENT_EPSILON ||
      Math.abs(this.world.pacman.moved.y) > POINT_CONSUME_MOVEMENT_EPSILON
    ) {
      return false;
    }

    return (
      Math.abs(this.world.pacman.x - point.x) <= POINT_CONSUME_POSITION_EPSILON &&
      Math.abs(this.world.pacman.y - point.y) <= POINT_CONSUME_POSITION_EPSILON
    );
  }

  private updateEatEffects(deltaMs: number): void {
    for (let i = this.eatEffects.length - 1; i >= 0; i -= 1) {
      const effect = this.eatEffects[i];
      effect.elapsedMs += deltaMs;
      if (effect.elapsedMs >= effect.durationMs) {
        this.eatEffects.splice(i, 1);
      }
    }
  }

  private toPointCenter(tile: TilePosition): { x: number; y: number } {
    return {
      x: tile.x * this.world.tileSize + this.world.tileSize / 2,
      y: tile.y * this.world.tileSize + this.world.tileSize / 2,
    };
  }
}
