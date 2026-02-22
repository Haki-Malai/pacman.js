/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CAMERA } from '../config/constants';
import { CameraSystem } from '../game/systems/CameraSystem';
import type { WorldState } from '../game/domain/world/WorldState';
import type { CanvasRendererAdapter } from '../game/infrastructure/adapters/CanvasRendererAdapter';

function createCameraMock() {
  const setBounds = vi.fn<(width: number, height: number) => void>();
  const setZoom = vi.fn<(zoom: number) => void>();
  const setViewport = vi.fn<(width: number, height: number) => void>();
  const startFollow = vi.fn<(target: { x: number; y: number }, lerpX: number, lerpY: number) => void>();
  const update = vi.fn<() => void>();

  return {
    setBounds,
    setZoom,
    setViewport,
    startFollow,
    update,
  };
}

function createWorldStub(): WorldState {
  return {
    map: {
      widthInPixels: 816,
      heightInPixels: 816,
    },
    pacman: {
      x: 120,
      y: 240,
    },
  } as unknown as WorldState;
}

describe('CameraSystem', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('applies viewport resize and camera zoom on start and window resize', () => {
    const world = createWorldStub();
    const camera = createCameraMock();

    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    host.append(canvas);
    document.body.append(host);

    let hostWidth = 640;
    let hostHeight = 360;
    vi.spyOn(host, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: hostWidth,
          bottom: hostHeight,
          width: hostWidth,
          height: hostHeight,
          toJSON: () => '',
        }) as DOMRect,
    );

    const resizeSpy = vi.fn((width: number, height: number) => {
      canvas.width = width;
      canvas.height = height;
    });

    const renderer = {
      resize: resizeSpy,
    };

    const system = new CameraSystem(
      world,
      camera,
      renderer as unknown as CanvasRendererAdapter,
      canvas,
    );

    system.start();

    expect(camera.setBounds).toHaveBeenCalledWith(816, 816);
    expect(camera.startFollow).toHaveBeenCalledWith(world.pacman, CAMERA.followLerp.x, CAMERA.followLerp.y);

    expect(resizeSpy).toHaveBeenLastCalledWith(640, 360);
    expect(camera.setViewport).toHaveBeenLastCalledWith(640, 360);
    expect(camera.setZoom).toHaveBeenLastCalledWith(CAMERA.zoom);

    hostWidth = 320;
    hostHeight = 240;
    window.dispatchEvent(new Event('resize'));

    expect(resizeSpy).toHaveBeenLastCalledWith(320, 240);
    expect(camera.setViewport).toHaveBeenLastCalledWith(320, 240);
    expect(camera.setZoom).toHaveBeenLastCalledWith(CAMERA.zoom);
  });

  it('registers and removes both window and visualViewport resize listeners', () => {
    const world = createWorldStub();
    const camera = createCameraMock();

    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    host.append(canvas);
    document.body.append(host);

    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 480,
      bottom: 320,
      width: 480,
      height: 320,
      toJSON: () => '',
    });

    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');

    const visualViewportAddSpy = vi.fn();
    const visualViewportRemoveSpy = vi.fn();

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        addEventListener: visualViewportAddSpy,
        removeEventListener: visualViewportRemoveSpy,
      },
    });

    const renderer = {
      resize: vi.fn((width: number, height: number) => {
        canvas.width = width;
        canvas.height = height;
      }),
    };

    const system = new CameraSystem(
      world,
      camera,
      renderer as unknown as CanvasRendererAdapter,
      canvas,
    );

    system.start();

    expect(addWindowListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(visualViewportAddSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    system.destroy();

    expect(removeWindowListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(visualViewportRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
