import { Camera2D } from '../../engine/camera';
import { COLLECTIBLE_CONFIG, PACMAN_PORTAL_BLINK } from '../../config/constants';
import { WorldState, WorldTile } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { AssetCatalog } from '../infrastructure/assets/AssetCatalog';
import { CollectibleSystem } from './CollectibleSystem';
import { resolveGhostSpriteSheetKey } from './resolveGhostSpriteSheetKey';

const BACKGROUND_COLOR = '#2d2d2d';
const BACKGROUND_RGB = { r: 45, g: 45, b: 45 };
const BASE_POINT_SIZE = COLLECTIBLE_CONFIG[0].size;
const POWER_POINT_SIZE = COLLECTIBLE_CONFIG[1].size;
const WALL_ALPHA_THRESHOLD = 128;
const JAIL_FOREGROUND_LOCAL_IDS = new Set([16, 17, 18, 19, 20, 21]);

type TileCanvas = HTMLCanvasElement | OffscreenCanvas;
type TileContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export class RenderSystem {
  private readonly collectibles: CollectibleSystem;
  private readonly deviceTileCache = new Map<string, CanvasImageSource>();

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

    if (!this.canDrawDeviceSnappedMap()) {
      this.renderer.beginWorld(this.camera);
      this.drawMap(false);
      this.drawPoints();
      this.drawEatEffects();
      this.drawGhosts();
      this.drawJailForeground();
      this.drawPacman();
      this.renderer.endWorld();
      return;
    }

    this.drawMapDeviceSnapped(false);

    this.renderer.beginWorld(this.camera);
    this.drawPoints();
    this.drawEatEffects();
    this.drawGhosts();
    this.renderer.endWorld();

    this.drawMapDeviceSnapped(true);

    this.renderer.beginWorld(this.camera);
    this.drawPacman();
    this.renderer.endWorld();
  }

  private canDrawDeviceSnappedMap(): boolean {
    const renderer = this.renderer as CanvasRendererAdapter & {
      drawImageDevice?: CanvasRendererAdapter['drawImageDevice'];
      pixelRatio?: number;
      deviceWidth?: number;
      deviceHeight?: number;
    };

    return (
      typeof renderer.drawImageDevice === 'function' &&
      Number.isFinite(renderer.pixelRatio) &&
      Number.isFinite(renderer.deviceWidth) &&
      Number.isFinite(renderer.deviceHeight) &&
      renderer.pixelRatio > 0 &&
      renderer.deviceWidth > 0 &&
      renderer.deviceHeight > 0
    );
  }

  private drawMapDeviceSnapped(jailForegroundOnly: boolean): void {
    const tileDeviceSize = this.resolveTileDeviceSize();
    const deviceScale = tileDeviceSize / this.world.tileSize;
    const originX = Math.round(-this.camera.x * deviceScale);
    const originY = Math.round(-this.camera.y * deviceScale);

    this.world.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (!this.isRenderableMapTile(tile)) {
          return;
        }

        const isJailForeground = this.isJailForegroundTile(tile);
        if (jailForegroundOnly !== isJailForeground) {
          return;
        }

        const x = originX + tile.x * tileDeviceSize;
        const y = originY + tile.y * tileDeviceSize;

        if (
          x + tileDeviceSize < 0 ||
          y + tileDeviceSize < 0 ||
          x > this.renderer.deviceWidth ||
          y > this.renderer.deviceHeight
        ) {
          return;
        }

        const cachedTile = this.getCachedDeviceTile(tile, !jailForegroundOnly, tileDeviceSize);
        if (!cachedTile) {
          return;
        }

        this.renderer.drawImageDevice(cachedTile, x, y);
      });
    });
  }

  private resolveTileDeviceSize(): number {
    return Math.max(1, Math.round(this.world.tileSize * this.camera.getZoom() * this.renderer.pixelRatio));
  }

  private getCachedDeviceTile(
    tile: WorldTile,
    fillBackground: boolean,
    tileDeviceSize: number,
  ): CanvasImageSource | undefined {
    const cacheKey = [
      tile.imagePath,
      tile.rotation,
      tile.flipX ? 'flip-x' : 'no-flip-x',
      tile.flipY ? 'flip-y' : 'no-flip-y',
      fillBackground ? 'opaque-background' : 'transparent-background',
      tileDeviceSize,
    ].join('|');

    const cached = this.deviceTileCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const image = this.assets.getTileImage(tile.imagePath);
    if (!image) {
      return undefined;
    }

    const tileCanvas = this.createTileCanvas(tileDeviceSize);
    if (!tileCanvas) {
      return undefined;
    }

    const { canvas, context } = tileCanvas;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, tileDeviceSize, tileDeviceSize);

    context.save();
    context.translate(tileDeviceSize / 2, tileDeviceSize / 2);

    if (tile.rotation !== 0) {
      context.rotate(tile.rotation);
    }

    if (tile.flipX || tile.flipY) {
      context.scale(tile.flipX ? -1 : 1, tile.flipY ? -1 : 1);
    }

    context.drawImage(image, -tileDeviceSize / 2, -tileDeviceSize / 2, tileDeviceSize, tileDeviceSize);
    context.restore();

    this.normalizeTilePixels(context, tileDeviceSize, tileDeviceSize, fillBackground);
    this.deviceTileCache.set(cacheKey, canvas);

    return canvas;
  }

  private createTileCanvas(size: number): { canvas: TileCanvas; context: TileContext } | undefined {
    const canvasSize = Math.max(1, Math.ceil(size));

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(canvasSize, canvasSize);
      const context = canvas.getContext('2d');
      return context ? { canvas, context } : undefined;
    }

    if (typeof document === 'undefined') {
      return undefined;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const context = canvas.getContext('2d');
    return context ? { canvas, context } : undefined;
  }

  private normalizeTilePixels(
    context: TileContext,
    width: number,
    height: number,
    fillBackground: boolean,
  ): void {
    let imageData: ImageData;

    try {
      imageData = context.getImageData(0, 0, width, height);
    } catch {
      return;
    }

    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];

      if (alpha < WALL_ALPHA_THRESHOLD) {
        if (fillBackground) {
          data[index] = BACKGROUND_RGB.r;
          data[index + 1] = BACKGROUND_RGB.g;
          data[index + 2] = BACKGROUND_RGB.b;
          data[index + 3] = 255;
        } else {
          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 0;
          data[index + 3] = 0;
        }

        continue;
      }

      data[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
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
      const sheetKey = resolveGhostSpriteSheetKey(this.world, ghost);
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
