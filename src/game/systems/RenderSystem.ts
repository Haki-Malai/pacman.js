import { Camera2D } from '../../engine/camera';
import { COLLECTIBLE_CONFIG, GHOST_SCARED_WARNING_DURATION_MS, PACMAN_PORTAL_BLINK } from '../../config/constants';
import { WorldState, WorldTile } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { AssetCatalog } from '../infrastructure/assets/AssetCatalog';
import { CollectibleSystem } from './CollectibleSystem';

const BACKGROUND_COLOR = '#2d2d2d';
const BASE_POINT_SIZE = COLLECTIBLE_CONFIG[0].size;
const POWER_POINT_SIZE = COLLECTIBLE_CONFIG[1].size;
const JAIL_FOREGROUND_LOCAL_IDS = new Set([16, 17, 18, 19, 20, 21]);

export class RenderSystem {
  private readonly collectibles: CollectibleSystem;

  constructor(
    private readonly world: WorldState,
    private readonly renderer: CanvasRendererAdapter,
    private readonly camera: Camera2D,
    private readonly assets: AssetCatalog,
    collectibles?: CollectibleSystem,
  ) {
    this.collectibles = collectibles ?? new CollectibleSystem(this.world);
  }

  update(deltaMs: number): void {
    this.collectibles.update(deltaMs);
  }

  render(): void {
    this.renderer.clear(BACKGROUND_COLOR);
    this.renderer.beginWorld(this.camera);
    this.drawMap(false);
    this.drawPoints();
    this.drawEatEffects();
    this.drawGhosts();
    this.drawJailForeground();
    this.drawPacman();
    this.renderer.endWorld();
  }

  private drawMap(includeJailForeground: boolean): void {
    this.world.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (!this.isRenderableMapTile(tile)) {
          return;
        }

        if (!includeJailForeground && this.isJailForegroundTile(tile)) {
          return;
        }

        this.drawMapTile(tile);
      });
    });
  }

  private drawJailForeground(): void {
    this.world.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (!this.isRenderableMapTile(tile) || !this.isJailForegroundTile(tile)) {
          return;
        }

        this.drawMapTile(tile);
      });
    });
  }

  private drawMapTile(tile: WorldTile): void {
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
  }

  private isRenderableMapTile(tile: WorldTile): boolean {
    return tile.gid !== null && tile.imagePath !== '(empty)' && tile.imagePath !== '(unknown)';
  }

  private isJailForegroundTile(tile: WorldTile): boolean {
    return tile.localId !== null && JAIL_FOREGROUND_LOCAL_IDS.has(tile.localId);
  }

  private drawPoints(): void {
    const pointImage = this.assets.getCollectibleImage('point');
    if (!pointImage) {
      return;
    }

    for (const point of this.collectibles.getPoints()) {
      const size = point.kind === 'power' ? POWER_POINT_SIZE : BASE_POINT_SIZE;
      this.renderer.drawImageCentered(pointImage, point.x, point.y, size, size, 0, false, false);
    }
  }

  private drawEatEffects(): void {
    const pointImage = this.assets.getCollectibleImage('point');
    const eatEffects = this.collectibles.getEatEffects();
    if (!pointImage || !eatEffects.length) {
      return;
    }

    const context = this.renderer.context;
    eatEffects.forEach((effect) => {
      const progress = Math.min(1, effect.elapsedMs / effect.durationMs);
      const growProgress = 1 - (1 - progress) * (1 - progress);
      const size = effect.sizeStart + (effect.sizeEnd - effect.sizeStart) * growProgress;
      const alpha = (1 - progress) * (1 - progress);

      context.save();
      context.globalAlpha = alpha;
      context.drawImage(pointImage, effect.x - size / 2, effect.y - size / 2, size, size);
      context.restore();
    });
  }

  private drawPacman(): void {
    if (!this.isPacmanVisible()) {
      return;
    }

    const pacmanSheet = this.assets.getSpriteSheet('pacman');
    if (!pacmanSheet) {
      return;
    }

    this.renderer.drawSpriteFrame(
      pacmanSheet,
      this.world.pacmanAnimation.frame,
      this.world.pacman.x,
      this.world.pacman.y,
      this.world.pacman.displayWidth,
      this.world.pacman.displayHeight,
      (this.world.pacman.angle * Math.PI) / 180,
      this.world.pacman.flipX,
      this.world.pacman.flipY,
    );
  }

  private isPacmanVisible(): boolean {
    const deathRecoveryRemaining = this.world.pacman.deathRecoveryRemainingMs ?? 0;
    if (deathRecoveryRemaining > 0) {
      return this.world.pacman.deathRecoveryVisible ?? true;
    }

    const remaining = this.world.pacman.portalBlinkRemainingMs ?? 0;
    if (remaining <= 0) {
      return true;
    }

    const elapsed = this.world.pacman.portalBlinkElapsedMs ?? 0;
    const blinkPhase = Math.floor(elapsed / PACMAN_PORTAL_BLINK.intervalMs);
    return blinkPhase % 2 === 0;
  }

  private drawGhosts(): void {
    this.world.ghosts.forEach((ghost) => {
      const sheetKey = this.resolveGhostSheetKey(ghost);
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

  private resolveGhostSheetKey(ghost: WorldState['ghosts'][number]): 'scared' | typeof ghost.key {
    if (!ghost.state.scared) {
      return ghost.key;
    }

    const remaining = this.world.ghostScaredTimers.get(ghost) ?? 0;
    if (remaining > 0 && remaining <= GHOST_SCARED_WARNING_DURATION_MS) {
      const warning = this.world.ghostScaredWarnings.get(ghost);
      if (warning?.showBaseColor) {
        return ghost.key;
      }
    }

    return 'scared';
  }
}
