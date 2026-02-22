import { CAMERA, COARSE_POINTER_MEDIA_QUERY } from '../../config/constants';
import { WorldState } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';

interface CameraLike {
  setBounds(width: number, height: number): void;
  setZoom(zoom: number): void;
  setViewport(width: number, height: number): void;
  startFollow(target: { x: number; y: number }, lerpX: number, lerpY: number): void;
  update(): void;
}

const MIN_CAMERA_ZOOM = 0.001;
export const MOBILE_POINTER_MEDIA_QUERY = COARSE_POINTER_MEDIA_QUERY;

export interface ResolveCameraZoomParams {
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  defaultZoom: number;
  coarsePointer: boolean;
}

export function computeContainZoom(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number): number {
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const safeWorldWidth = Math.max(1, worldWidth);
  const safeWorldHeight = Math.max(1, worldHeight);

  return Math.min(safeViewportWidth / safeWorldWidth, safeViewportHeight / safeWorldHeight);
}

export function resolveCameraZoom(params: ResolveCameraZoomParams): number {
  return Math.max(MIN_CAMERA_ZOOM, params.defaultZoom);
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
    this.camera.setZoom(
      resolveCameraZoom({
        viewportWidth: this.canvas.width,
        viewportHeight: this.canvas.height,
        worldWidth: this.world.map.widthInPixels,
        worldHeight: this.world.map.heightInPixels,
        defaultZoom: CAMERA.zoom,
        coarsePointer: this.isCoarsePointerInput(),
      }),
    );
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

  private isCoarsePointerInput(): boolean {
    if (typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia(MOBILE_POINTER_MEDIA_QUERY).matches;
  }
}
