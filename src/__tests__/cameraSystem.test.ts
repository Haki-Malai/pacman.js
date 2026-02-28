import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMERA } from '../config/constants';
import { CameraSystem } from '../game/systems/CameraSystem';

describe('CameraSystem', () => {
  let resizeHandler: (() => void) | undefined;
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resizeHandler = undefined;
    addEventListenerSpy = vi.fn((eventName: string, handler: EventListenerOrEventListenerObject) => {
      if (eventName === 'resize' && typeof handler === 'function') {
        resizeHandler = handler as () => void;
      }
    });
    removeEventListenerSpy = vi.fn();

    vi.stubGlobal('window', {
      innerWidth: 1280,
      innerHeight: 720,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createSystem() {
    const world = {
      map: { widthInPixels: 448, heightInPixels: 496 },
      pacman: { x: 96, y: 128 },
    };
    const camera = {
      setBounds: vi.fn(),
      setZoom: vi.fn(),
      setViewport: vi.fn(),
      startFollow: vi.fn(),
      snapToFollowTarget: vi.fn(),
      update: vi.fn(),
    };
    const renderer = {
      resize: vi.fn(),
    };
    const canvas = { width: 640, height: 480 } as HTMLCanvasElement;

    const system = new CameraSystem(world as never, camera, renderer as never, canvas);
    return { system, world, camera, renderer, canvas };
  }

  it('configures and snaps camera at startup', () => {
    const { system, world, camera, renderer, canvas } = createSystem();

    system.start();

    expect(camera.setBounds).toHaveBeenCalledWith(world.map.widthInPixels, world.map.heightInPixels);
    expect(camera.setZoom).toHaveBeenCalledWith(CAMERA.zoom);
    expect(camera.startFollow).toHaveBeenCalledWith(world.pacman, CAMERA.followLerp.x, CAMERA.followLerp.y);
    expect(renderer.resize).toHaveBeenCalledWith(1280, 720);
    expect(camera.setViewport).toHaveBeenCalledWith(canvas.width, canvas.height);
    expect(camera.snapToFollowTarget).toHaveBeenCalledOnce();
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('updates renderer and viewport when resize handler runs', () => {
    const { system, camera, renderer, canvas } = createSystem();
    system.start();

    const stubWindow = globalThis.window as unknown as { innerWidth: number; innerHeight: number };
    stubWindow.innerWidth = 1440;
    stubWindow.innerHeight = 900;
    canvas.width = 800;
    canvas.height = 600;

    resizeHandler?.();

    expect(renderer.resize).toHaveBeenNthCalledWith(2, 1440, 900);
    expect(camera.setViewport).toHaveBeenNthCalledWith(2, 800, 600);
  });

  it('forwards update calls and removes resize listener on destroy', () => {
    const { system, camera } = createSystem();
    system.start();

    system.update();
    expect(camera.update).toHaveBeenCalledOnce();

    system.destroy();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
