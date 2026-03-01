import { AssetStore, SpriteSheetAsset } from '../../../engine/assets';
import { CollisionMaskFrame } from '../../domain/valueObjects/CollisionMask';
import { WorldMapData } from '../../domain/world/WorldState';

const SPRITE_SHEET_FRAME_WIDTH = 85;
const SPRITE_SHEET_FRAME_HEIGHT = 91;

const SPRITESHEET_SOURCES = {
  pacman: 'assets/sprites/PacMan.png',
  blinky: 'assets/sprites/Blinky.png',
  clyde: 'assets/sprites/Clyde.png',
  pinky: 'assets/sprites/Pinky.png',
  inky: 'assets/sprites/Inky.png',
  scared: 'assets/sprites/Scared.png',
} as const;

export type SpriteSheetKey = keyof typeof SPRITESHEET_SOURCES;

export class AssetCatalog {
  private readonly assets = new AssetStore();
  private readonly tileImageCache = new Map<string, HTMLImageElement>();
  private readonly spritesheets = new Map<SpriteSheetKey, SpriteSheetAsset>();
  private readonly collectibles = new Map<string, HTMLImageElement>();
  private readonly spriteMaskCache = new Map<string, CollisionMaskFrame>();
  private maskCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private maskContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  async loadForMap(map: WorldMapData, baseTilePath: string): Promise<void> {
    const uniqueTileImages = new Set<string>();

    map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (tile.imagePath !== '(empty)' && tile.imagePath !== '(unknown)') {
          uniqueTileImages.add(tile.imagePath);
        }
      });
    });

    const jobs: Array<Promise<unknown>> = [];

    uniqueTileImages.forEach((imagePath) => {
      jobs.push(this.assets.loadImage(imagePath, `${baseTilePath}/${imagePath}`));
    });

    Object.entries(SPRITESHEET_SOURCES).forEach(([key, src]) => {
      jobs.push(this.assets.loadSpriteSheet(key, src, SPRITE_SHEET_FRAME_WIDTH, SPRITE_SHEET_FRAME_HEIGHT));
    });

    jobs.push(this.assets.loadImage('point', 'assets/sprites/Point.png'));

    await Promise.all(jobs);

    uniqueTileImages.forEach((imagePath) => {
      this.tileImageCache.set(imagePath, this.assets.getImage(imagePath));
    });

    Object.keys(SPRITESHEET_SOURCES).forEach((key) => {
      const typedKey = key as SpriteSheetKey;
      this.spritesheets.set(typedKey, this.assets.getSpriteSheet(key));
    });

    this.collectibles.set('point', this.assets.getImage('point'));
  }

  getTileImage(path: string): HTMLImageElement | undefined {
    return this.tileImageCache.get(path);
  }

  getSpriteSheet(key: SpriteSheetKey): SpriteSheetAsset | undefined {
    return this.spritesheets.get(key);
  }

  getCollectibleImage(key: string): HTMLImageElement | undefined {
    return this.collectibles.get(key);
  }

  getSpriteMask(
    key: SpriteSheetKey,
    frame: number,
    width: number,
    height: number,
    alphaThreshold: number = 1,
  ): CollisionMaskFrame {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    const safeThreshold = Math.max(0, Math.min(255, Math.floor(alphaThreshold)));
    const cacheKey = `${key}:${frame}:${safeWidth}:${safeHeight}:${safeThreshold}`;
    const cached = this.spriteMaskCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const sheet = this.getSpriteSheet(key);
    if (!sheet) {
      throw new Error(`Spritesheet asset not found: ${key}`);
    }

    const columns = Math.max(1, Math.floor(sheet.image.width / sheet.frameWidth));
    const clampedFrame = Math.max(0, Math.min(frame, sheet.frameCount - 1));
    const frameX = (clampedFrame % columns) * sheet.frameWidth;
    const frameY = Math.floor(clampedFrame / columns) * sheet.frameHeight;
    const context = this.getMaskContext(safeWidth, safeHeight);
    context.save();
    context.clearRect(0, 0, safeWidth, safeHeight);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      sheet.image,
      frameX,
      frameY,
      sheet.frameWidth,
      sheet.frameHeight,
      0,
      0,
      safeWidth,
      safeHeight,
    );

    const imageData = context.getImageData(0, 0, safeWidth, safeHeight).data;
    context.restore();

    const opaque = new Uint8Array(safeWidth * safeHeight);
    for (let index = 0; index < opaque.length; index += 1) {
      const alpha = imageData[index * 4 + 3] ?? 0;
      opaque[index] = alpha >= safeThreshold ? 1 : 0;
    }

    const mask: CollisionMaskFrame = {
      width: safeWidth,
      height: safeHeight,
      opaque,
    };
    this.spriteMaskCache.set(cacheKey, mask);
    return mask;
  }

  private getMaskContext(
    width: number,
    height: number,
  ): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    if (
      this.maskContext &&
      this.maskCanvas &&
      this.maskCanvas.width === width &&
      this.maskCanvas.height === height
    ) {
      return this.maskContext;
    }

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Offscreen canvas 2D context is required for sprite mask generation');
      }
      context.imageSmoothingEnabled = false;
      this.maskCanvas = canvas;
      this.maskContext = context;
      return context;
    }

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context is required for sprite mask generation');
      }
      context.imageSmoothingEnabled = false;
      this.maskCanvas = canvas;
      this.maskContext = context;
      return context;
    }

    throw new Error('No canvas implementation available for sprite mask generation');
  }
}
