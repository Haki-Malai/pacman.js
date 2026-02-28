import { CAMERA } from '../../config/constants';
import { WorldState } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';

interface CameraLike {
  setBounds(width: number, height: number): void;
  setZoom(zoom: number): void;
  setViewport(width: number, height: number): void;
  startFollow(target: { x: number; y: number }, lerpX: number, lerpY: number): void;
  snapToFollowTarget(): void;
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
    this.camera.setZoom(CAMERA.zoom);
    this.camera.startFollow(this.world.pacman, CAMERA.followLerp.x, CAMERA.followLerp.y);

    this.handleResize();
    this.camera.snapToFollowTarget();
    this.onResize = () => {
      this.handleResize();
    };
    window.addEventListener('resize', this.onResize);
  }

  update(): void {
    this.camera.update();
  }

  destroy(): void {
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      this.onResize = undefined;
    }
  }

  private handleResize(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.camera.setViewport(this.canvas.width, this.canvas.height);
  }
}
