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

  get width(): number {
    return this.renderer.width;
  }

  get height(): number {
    return this.renderer.height;
  }

  get deviceWidth(): number {
    return this.renderer.deviceWidth;
  }

  get deviceHeight(): number {
    return this.renderer.deviceHeight;
  }

  get pixelRatio(): number {
    return this.renderer.pixelRatio;
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

  drawImageDevice(image: CanvasImageSource, x: number, y: number): void {
    this.renderer.drawImageDevice(image, x, y);
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
