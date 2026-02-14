import { AssetStore, SpriteSheetAsset } from '../../../engine/assets';
import { WorldMapData } from '../../domain/world/WorldState';

const SPRITE_SHEET_FRAME_WIDTH = 85;
const SPRITE_SHEET_FRAME_HEIGHT = 91;

const SPRITESHEET_SOURCES = {
  pacman: '/assets/sprites/PacMan.png',
  blinky: '/assets/sprites/Blinky.png',
  clyde: '/assets/sprites/Clyde.png',
  pinky: '/assets/sprites/Pinky.png',
  inky: '/assets/sprites/Inky.png',
  scared: '/assets/sprites/Scared.png',
} as const;

export type SpriteSheetKey = keyof typeof SPRITESHEET_SOURCES;

export class AssetCatalog {
  private readonly assets = new AssetStore();
  private readonly tileImageCache = new Map<string, HTMLImageElement>();
  private readonly spritesheets = new Map<SpriteSheetKey, SpriteSheetAsset>();

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

    await Promise.all(jobs);

    uniqueTileImages.forEach((imagePath) => {
      this.tileImageCache.set(imagePath, this.assets.getImage(imagePath));
    });

    Object.keys(SPRITESHEET_SOURCES).forEach((key) => {
      const typedKey = key as SpriteSheetKey;
      this.spritesheets.set(typedKey, this.assets.getSpriteSheet(key));
    });
  }

  getTileImage(path: string): HTMLImageElement | undefined {
    return this.tileImageCache.get(path);
  }

  getSpriteSheet(key: SpriteSheetKey): SpriteSheetAsset | undefined {
    return this.spritesheets.get(key);
  }
}
