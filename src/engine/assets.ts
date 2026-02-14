export interface SpriteSheetAsset {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export class AssetStore {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly jsonData = new Map<string, unknown>();
  private readonly spriteSheets = new Map<string, SpriteSheetAsset>();

  async loadJSON<T>(key: string, src: string): Promise<T> {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${src}`);
    }
    const data = (await response.json()) as T;
    this.jsonData.set(key, data);
    return data;
  }

  async loadImage(key: string, src: string): Promise<HTMLImageElement> {
    const image = await this.createImage(src);
    this.images.set(key, image);
    return image;
  }

  async loadSpriteSheet(
    key: string,
    src: string,
    frameWidth: number,
    frameHeight: number,
  ): Promise<SpriteSheetAsset> {
    const image = await this.createImage(src);
    const columns = Math.max(1, Math.floor(image.width / frameWidth));
    const rows = Math.max(1, Math.floor(image.height / frameHeight));
    const sheet: SpriteSheetAsset = {
      image,
      frameWidth,
      frameHeight,
      frameCount: columns * rows,
    };
    this.spriteSheets.set(key, sheet);
    return sheet;
  }

  getJSON<T>(key: string): T {
    const data = this.jsonData.get(key);
    if (!data) {
      throw new Error(`JSON asset not found: ${key}`);
    }
    return data as T;
  }

  getImage(key: string): HTMLImageElement {
    const image = this.images.get(key);
    if (!image) {
      throw new Error(`Image asset not found: ${key}`);
    }
    return image;
  }

  getSpriteSheet(key: string): SpriteSheetAsset {
    const sheet = this.spriteSheets.get(key);
    if (!sheet) {
      throw new Error(`Spritesheet asset not found: ${key}`);
    }
    return sheet;
  }

  private createImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      image.src = src;
    });
  }
}
