import { addScore } from '../../state/gameState';
import { Camera2D } from '../../engine/camera';
import { COLLECTIBLE_CONFIG } from '../../config/constants';
import { buildPointLayout } from '../domain/services/PointLayoutService';
import { TilePosition } from '../domain/valueObjects/TilePosition';
import { WorldState } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { AssetCatalog } from '../infrastructure/assets/AssetCatalog';

const BACKGROUND_COLOR = '#2d2d2d';
const BASE_POINT_SIZE = COLLECTIBLE_CONFIG[0].size;
const POWER_POINT_SIZE = COLLECTIBLE_CONFIG[1].size;
const EAT_EFFECT_DURATION_MS = 180;

type CollectibleKind = 'base' | 'power';

type CollectiblePoint = {
  tile: TilePosition;
  x: number;
  y: number;
  kind: CollectibleKind;
};

type EatEffect = {
  x: number;
  y: number;
  elapsedMs: number;
  durationMs: number;
  sizeStart: number;
  sizeEnd: number;
};

function tileKey(tile: TilePosition): string {
  return `${tile.x},${tile.y}`;
}

export class RenderSystem {
  private readonly pointsByTile = new Map<string, CollectiblePoint>();
  private readonly eatEffects: EatEffect[] = [];

  constructor(
    private readonly world: WorldState,
    private readonly renderer: CanvasRendererAdapter,
    private readonly camera: Camera2D,
    private readonly assets: AssetCatalog,
  ) {
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

  render(): void {
    this.renderer.clear(BACKGROUND_COLOR);
    this.renderer.beginWorld(this.camera);
    this.drawMap();
    this.drawPoints();
    this.drawEatEffects();
    this.drawEntities();
    this.renderer.endWorld();
  }

  private consumePointAtPacmanTile(): void {
    // Consume only when Pac-Man is centered in current tile to keep behavior stable.
    if (Math.abs(this.world.pacman.moved.x) > 0.05 || Math.abs(this.world.pacman.moved.y) > 0.05) {
      return;
    }

    const currentTile = { x: this.world.pacman.tile.x, y: this.world.pacman.tile.y };
    const key = tileKey(currentTile);
    const point = this.pointsByTile.get(key);
    if (!point) {
      return;
    }

    this.pointsByTile.delete(key);

    const scoreDelta = point.kind === 'power' ? COLLECTIBLE_CONFIG[1].score : COLLECTIBLE_CONFIG[0].score;
    addScore(scoreDelta);

    const baseSize = point.kind === 'power' ? POWER_POINT_SIZE : BASE_POINT_SIZE;
    this.eatEffects.push({
      x: point.x,
      y: point.y,
      elapsedMs: 0,
      durationMs: EAT_EFFECT_DURATION_MS,
      sizeStart: baseSize,
      sizeEnd: baseSize * 1.9,
    });
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

  private drawMap(): void {
    this.world.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (tile.gid === null || tile.imagePath === '(empty)' || tile.imagePath === '(unknown)') {
          return;
        }

        const image = this.assets.getTileImage(tile.imagePath);
        if (!image) {
          return;
        }

        const x = tile.x * this.world.tileSize + this.world.tileSize / 2;
        const y = tile.y * this.world.tileSize + this.world.tileSize / 2;

        this.renderer.drawImageCentered(
          image,
          x,
          y,
          this.world.tileSize,
          this.world.tileSize,
          tile.rotation,
          tile.flipX,
          tile.flipY,
        );
      });
    });
  }

  private drawPoints(): void {
    const pointImage = this.assets.getCollectibleImage('point');
    if (!pointImage) {
      return;
    }

    this.pointsByTile.forEach((point) => {
      const size = point.kind === 'power' ? POWER_POINT_SIZE : BASE_POINT_SIZE;
      this.renderer.drawImageCentered(pointImage, point.x, point.y, size, size, 0, false, false);
    });
  }

  private drawEatEffects(): void {
    const pointImage = this.assets.getCollectibleImage('point');
    if (!pointImage || !this.eatEffects.length) {
      return;
    }

    const context = this.renderer.context;
    this.eatEffects.forEach((effect) => {
      const progress = Math.min(1, effect.elapsedMs / effect.durationMs);
      const size = effect.sizeStart + (effect.sizeEnd - effect.sizeStart) * progress;
      const alpha = 1 - progress;

      context.save();
      context.globalAlpha = alpha;
      context.drawImage(pointImage, effect.x - size / 2, effect.y - size / 2, size, size);
      context.restore();
    });
  }

  private toPointCenter(tile: TilePosition): { x: number; y: number } {
    return {
      x: tile.x * this.world.tileSize + this.world.tileSize / 2,
      y: tile.y * this.world.tileSize + this.world.tileSize / 2,
    };
  }

  private drawEntities(): void {
    const pacmanSheet = this.assets.getSpriteSheet('pacman');
    if (pacmanSheet) {
      this.renderer.drawSpriteFrame(
        pacmanSheet,
        0,
        this.world.pacman.x,
        this.world.pacman.y,
        this.world.pacman.displayWidth,
        this.world.pacman.displayHeight,
        (this.world.pacman.angle * Math.PI) / 180,
        this.world.pacman.flipX,
        this.world.pacman.flipY,
      );
    }

    this.world.ghosts.forEach((ghost) => {
      const sheetKey = ghost.state.scared ? 'scared' : ghost.key;
      const sheet = this.assets.getSpriteSheet(sheetKey);
      if (!sheet) {
        return;
      }

      const frame = this.world.ghostAnimations.get(ghost)?.frame ?? 0;
      this.renderer.drawSpriteFrame(
        sheet,
        frame,
        ghost.x,
        ghost.y,
        ghost.displayWidth,
        ghost.displayHeight,
        (ghost.angle * Math.PI) / 180,
        ghost.flipX,
        ghost.flipY,
      );
    });
  }
}
