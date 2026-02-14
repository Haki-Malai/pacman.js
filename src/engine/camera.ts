import { clamp, lerp } from './math';

export interface CameraFollowTarget {
  x: number;
  y: number;
}

export class Camera2D {
  x = 0;
  y = 0;

  private zoom = 1;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private worldWidth = 1;
  private worldHeight = 1;

  private followTarget?: CameraFollowTarget;
  private followLerpX = 1;
  private followLerpY = 1;

  setViewport(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.clampToBounds();
  }

  setBounds(width: number, height: number): void {
    this.worldWidth = Math.max(1, width);
    this.worldHeight = Math.max(1, height);
    this.clampToBounds();
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.001, zoom);
    this.clampToBounds();
  }

  getZoom(): number {
    return this.zoom;
  }

  startFollow(target: CameraFollowTarget, lerpX: number, lerpY: number): void {
    this.followTarget = target;
    this.followLerpX = clamp(lerpX, 0, 1);
    this.followLerpY = clamp(lerpY, 0, 1);
  }

  update(): void {
    if (!this.followTarget) {
      this.clampToBounds();
      return;
    }

    const viewportWorldWidth = this.viewportWidth / this.zoom;
    const viewportWorldHeight = this.viewportHeight / this.zoom;

    const desiredX = this.followTarget.x - viewportWorldWidth / 2;
    const desiredY = this.followTarget.y - viewportWorldHeight / 2;

    this.x = lerp(this.x, desiredX, this.followLerpX);
    this.y = lerp(this.y, desiredY, this.followLerpY);
    this.clampToBounds();
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: this.x + screenX / this.zoom,
      y: this.y + screenY / this.zoom,
    };
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -this.x * this.zoom, -this.y * this.zoom);
  }

  private clampToBounds(): void {
    const viewportWorldWidth = this.viewportWidth / this.zoom;
    const viewportWorldHeight = this.viewportHeight / this.zoom;
    const maxX = Math.max(0, this.worldWidth - viewportWorldWidth);
    const maxY = Math.max(0, this.worldHeight - viewportWorldHeight);

    this.x = clamp(this.x, 0, maxX);
    this.y = clamp(this.y, 0, maxY);
  }
}
