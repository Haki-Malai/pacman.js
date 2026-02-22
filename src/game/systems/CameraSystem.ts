import { CAMERA } from '../../config/constants';
import { WorldState } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';

interface CameraLike {
  setBounds(width: number, height: number): void;
  setZoom(zoom: number): void;
  setViewport(width: number, height: number): void;
  startFollow(target: { x: number; y: number }, lerpX: number, lerpY: number): void;
  update(): void;
}

export class CameraSystem {
  private onResize?: () => void;

  constructor(
    private readonly world: WorldState,
    private readonly camera: CameraLike,
    private readonly renderer: CanvasRendererAdapter,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  start(): void {
    this.camera.setBounds(this.world.map.widthInPixels, this.world.map.heightInPixels);
    this.camera.startFollow(this.world.pacman, CAMERA.followLerp.x, CAMERA.followLerp.y);

    this.onResize = () => {
      this.handleResize();
    };

    window.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);

    this.handleResize();
  }

  update(): void {
    this.camera.update();
  }

  destroy(): void {
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      window.visualViewport?.removeEventListener('resize', this.onResize);
      this.onResize = undefined;
    }
  }

  private handleResize(): void {
    const viewport = this.resolveViewportSize();
    this.renderer.resize(viewport.width, viewport.height);

    this.camera.setViewport(this.canvas.width, this.canvas.height);
    this.camera.setZoom(CAMERA.zoom);
  }

  private resolveViewportSize(): { width: number; height: number } {
    const hostRect = this.canvas.parentElement?.getBoundingClientRect();

    const width = Math.max(1, Math.floor(hostRect?.width ?? window.innerWidth));
    const height = Math.max(1, Math.floor(hostRect?.height ?? window.innerHeight));

    return {
      width,
      height,
    };
  }
}
