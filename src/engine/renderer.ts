import { Camera2D } from './camera';
import { SpriteSheetAsset } from './assets';

export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is required');
    }

    this.canvas = canvas;
    this.context = context;
    this.context.imageSmoothingEnabled = false;
  }

  resize(width: number, height: number): void {
    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));
  }

  clear(color: string): void {
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  beginWorld(camera: Camera2D): void {
    this.context.save();
    camera.applyTransform(this.context);
  }

  endWorld(): void {
    this.context.restore();
  }

  drawImageCentered(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
    flipX = false,
    flipY = false,
  ): void {
    this.context.save();
    this.context.translate(x, y);

    if (rotation !== 0) {
      this.context.rotate(rotation);
    }

    if (flipX || flipY) {
      this.context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    }

    this.context.drawImage(image, -width / 2, -height / 2, width, height);
    this.context.restore();
  }

  drawSpriteFrame(
    sheet: SpriteSheetAsset,
    frame: number,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
    flipX = false,
    flipY = false,
  ): void {
    const clampedFrame = Math.max(0, Math.min(frame, sheet.frameCount - 1));
    const columns = Math.max(1, Math.floor(sheet.image.width / sheet.frameWidth));
    const frameX = (clampedFrame % columns) * sheet.frameWidth;
    const frameY = Math.floor(clampedFrame / columns) * sheet.frameHeight;

    this.context.save();
    this.context.translate(x, y);

    if (rotation !== 0) {
      this.context.rotate(rotation);
    }

    if (flipX || flipY) {
      this.context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    }

    this.context.drawImage(
      sheet.image,
      frameX,
      frameY,
      sheet.frameWidth,
      sheet.frameHeight,
      -width / 2,
      -height / 2,
      width,
      height,
    );

    this.context.restore();
  }
}
