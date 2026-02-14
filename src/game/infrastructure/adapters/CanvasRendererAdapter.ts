import { Camera2D } from '../../../engine/camera';
import { CanvasRenderer } from '../../../engine/renderer';

export class CanvasRendererAdapter {
  readonly renderer: CanvasRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new CanvasRenderer(canvas);
  }

  get context(): CanvasRenderingContext2D {
    return this.renderer.context;
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  clear(color: string): void {
    this.renderer.clear(color);
  }

  beginWorld(camera: Camera2D): void {
    this.renderer.beginWorld(camera);
  }

  endWorld(): void {
    this.renderer.endWorld();
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
    this.renderer.drawImageCentered(image, x, y, width, height, rotation, flipX, flipY);
  }

  drawSpriteFrame(
    sheet: Parameters<CanvasRenderer['drawSpriteFrame']>[0],
    frame: number,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
    flipX = false,
    flipY = false,
  ): void {
    this.renderer.drawSpriteFrame(sheet, frame, x, y, width, height, rotation, flipX, flipY);
  }
}
