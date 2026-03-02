import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldState } from '../game/domain/world/WorldState';
import { DebugOverlaySystem } from '../game/systems/DebugOverlaySystem';
import { FakeDocument } from './helpers/fakeDom';

function createWorld(): WorldState {
  const emptyCollision = {
    collides: false,
    up: false,
    right: false,
    down: false,
    left: false,
    penGate: false,
    portal: null,
  };

  return {
    collisionDebugEnabled: false,
    hoveredDebugTile: null,
    pointerScreen: null,
    debugPanelText: '',
    tileSize: 16,
    map: {
      width: 1,
      height: 1,
      tiles: [
        [
          {
            x: 0,
            y: 0,
            rawGid: 1,
            gid: 1,
            localId: 1,
            imagePath: 'tile.png',
            rotation: 0,
            flipX: false,
            flipY: false,
            collision: emptyCollision,
          },
        ],
      ],
    },
    collisionGrid: {
      getTileAt: () => emptyCollision,
    },
    pacman: {
      tile: { x: 0, y: 0 },
    },
    ghosts: [],
  } as unknown as WorldState;
}

function createRenderer() {
  return {
    beginWorld: vi.fn(),
    endWorld: vi.fn(),
    context: {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
    },
  };
}

describe('DebugOverlaySystem', () => {
  let fakeDocument: FakeDocument;

  beforeEach(() => {
    fakeDocument = new FakeDocument();
    vi.stubGlobal('document', fakeDocument as unknown as Document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('hides and clears diagnostics panels when diagnostics mode is disabled', () => {
    const world = createWorld();
    world.debugPanelText = 'stale';
    const renderer = createRenderer();
    const camera = {
      screenToWorld: () => ({ x: 0, y: 0 }),
    };
    const system = new DebugOverlaySystem(world, renderer as never, camera);

    system.start();
    system.render();

    const runtimePanel = fakeDocument.getElementById('runtime-debug-panel');
    const collisionPanel = fakeDocument.getElementById('collision-debug-panel');
    expect(runtimePanel).not.toBeNull();
    expect(collisionPanel).not.toBeNull();
    expect(runtimePanel?.style.display).toBe('none');
    expect(collisionPanel?.style.display).toBe('none');
    expect(runtimePanel?.textContent).toBe('');
    expect(collisionPanel?.textContent).toBe('');
    expect(world.debugPanelText).toBe('');
  });

  it('shows FPS and frame time while diagnostics mode is enabled', () => {
    const world = createWorld();
    world.collisionDebugEnabled = true;
    const renderer = createRenderer();
    const camera = {
      screenToWorld: () => ({ x: 0, y: 0 }),
    };
    const system = new DebugOverlaySystem(world, renderer as never, camera);
    const nowSpy = vi
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(116);

    system.start();
    system.render();
    system.render();

    nowSpy.mockRestore();

    const runtimePanel = fakeDocument.getElementById('runtime-debug-panel');
    const collisionPanel = fakeDocument.getElementById('collision-debug-panel');

    expect(runtimePanel?.style.display).toBe('block');
    expect(collisionPanel?.style.display).toBe('block');
    expect(runtimePanel?.textContent).toContain('Runtime Diagnostics');
    expect(runtimePanel?.textContent).toContain('fps: 62.5');
    expect(runtimePanel?.textContent).toContain('frame: 16.00 ms');
  });

  it('removes diagnostics panels on destroy', () => {
    const world = createWorld();
    const renderer = createRenderer();
    const camera = {
      screenToWorld: () => ({ x: 0, y: 0 }),
    };
    const system = new DebugOverlaySystem(world, renderer as never, camera);

    system.start();
    expect(fakeDocument.getElementById('runtime-debug-panel')).not.toBeNull();
    expect(fakeDocument.getElementById('collision-debug-panel')).not.toBeNull();

    system.destroy();
    expect(fakeDocument.getElementById('runtime-debug-panel')).toBeNull();
    expect(fakeDocument.getElementById('collision-debug-panel')).toBeNull();
  });
});
