import { describe, expect, it, vi } from 'vitest';

import type { Direction } from '../game/domain/valueObjects/Direction';
import type { WorldState } from '../game/domain/world/WorldState';
import type { BrowserInputAdapter, PointerState } from '../game/infrastructure/adapters/BrowserInputAdapter';
import { InputSystem } from '../game/systems/InputSystem';

interface InputStubState {
  keyDown: Set<string>;
  swipeDirection: Direction | null;
  swipeEnabled: boolean;
}

interface InputStubListeners {
  onKeyDown: (_event: KeyboardEvent) => void;
  onPointerMove: (_pointer: PointerState) => void;
  onPointerDown: (_pointer: PointerState) => void;
  onPointerUp: (_pointer: PointerState) => void;
}

function createWorld(): WorldState {
  return {
    pacman: {
      direction: {
        next: 'right',
      },
    },
    ghosts: [],
    collisionDebugEnabled: false,
    hoveredDebugTile: null,
    debugPanelText: '',
    pointerScreen: null,
  } as unknown as WorldState;
}

function createPointerState(overrides: Partial<PointerState> = {}): PointerState {
  return {
    x: 0,
    y: 0,
    buttons: 0,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    cancelled: false,
    ...overrides,
  };
}

function createInputStub(initial?: Partial<InputStubState>): {
  input: BrowserInputAdapter;
  state: InputStubState;
  listeners: InputStubListeners;
} {
  const state: InputStubState = {
    keyDown: initial?.keyDown ?? new Set<string>(),
    swipeDirection: initial?.swipeDirection ?? null,
    swipeEnabled: initial?.swipeEnabled ?? false,
  };

  const listeners: InputStubListeners = {
    onKeyDown: () => undefined,
    onPointerMove: () => undefined,
    onPointerDown: () => undefined,
    onPointerUp: () => undefined,
  };

  const input = {
    isKeyDown: (code: string) => state.keyDown.has(code),
    isSwipeInputEnabled: () => state.swipeEnabled,
    getSwipeDirection: () => state.swipeDirection,
    onKeyDown: (listener: (_event: KeyboardEvent) => void) => {
      listeners.onKeyDown = listener;
      return () => {
        listeners.onKeyDown = () => undefined;
      };
    },
    onPointerMove: (listener: (_pointer: PointerState) => void) => {
      listeners.onPointerMove = listener;
      return () => {
        listeners.onPointerMove = () => undefined;
      };
    },
    onPointerDown: (listener: (_pointer: PointerState) => void) => {
      listeners.onPointerDown = listener;
      return () => {
        listeners.onPointerDown = () => undefined;
      };
    },
    onPointerUp: (listener: (_pointer: PointerState) => void) => {
      listeners.onPointerUp = listener;
      return () => {
        listeners.onPointerUp = () => undefined;
      };
    },
  } as unknown as BrowserInputAdapter;

  return {
    input,
    state,
    listeners,
  };
}

describe('InputSystem', () => {
  it('prioritizes keyboard input over swipe direction', () => {
    const world = createWorld();
    const pauseController = { togglePause: vi.fn() };
    const { input, state } = createInputStub({ swipeDirection: 'down' });
    state.keyDown.add('ArrowLeft');

    const system = new InputSystem(input, world, pauseController);
    system.update();

    expect(world.pacman.direction.next).toBe('left');
  });

  it('uses swipe direction when keyboard is idle', () => {
    const world = createWorld();
    const pauseController = { togglePause: vi.fn() };
    const { input } = createInputStub({ swipeDirection: 'up' });

    const system = new InputSystem(input, world, pauseController);
    system.update();

    expect(world.pacman.direction.next).toBe('up');
  });

  it('toggles pause immediately on desktop pointer down', () => {
    const world = createWorld();
    const pauseController = { togglePause: vi.fn() };
    const { input, listeners } = createInputStub({ swipeEnabled: false });
    const system = new InputSystem(input, world, pauseController);

    system.start();
    listeners.onPointerDown(createPointerState({ x: 12, y: 14, pointerType: 'mouse' }));

    expect(pauseController.togglePause).toHaveBeenCalledOnce();
    expect(world.pointerScreen).toEqual({ x: 12, y: 14 });
  });

  it('treats touch tap as pause toggle on release when swipe input is enabled', () => {
    const world = createWorld();
    const pauseController = { togglePause: vi.fn() };
    const { input, listeners } = createInputStub({ swipeEnabled: true });
    const system = new InputSystem(input, world, pauseController);

    system.start();
    listeners.onPointerDown(createPointerState({ x: 8, y: 9, pointerId: 9, pointerType: 'touch' }));
    expect(pauseController.togglePause).not.toHaveBeenCalled();

    listeners.onPointerUp(createPointerState({ x: 9, y: 10, pointerId: 9, pointerType: 'touch' }));
    expect(pauseController.togglePause).toHaveBeenCalledOnce();
  });

  it('does not toggle pause for swipe gestures on touch', () => {
    const world = createWorld();
    const pauseController = { togglePause: vi.fn() };
    const { input, listeners } = createInputStub({ swipeEnabled: true });
    const system = new InputSystem(input, world, pauseController);

    system.start();
    listeners.onPointerDown(createPointerState({ x: 20, y: 20, pointerId: 3, pointerType: 'touch' }));
    listeners.onPointerMove(createPointerState({ x: 48, y: 20, pointerId: 3, pointerType: 'touch' }));
    listeners.onPointerUp(createPointerState({ x: 48, y: 20, pointerId: 3, pointerType: 'touch' }));

    expect(pauseController.togglePause).not.toHaveBeenCalled();
  });
});
