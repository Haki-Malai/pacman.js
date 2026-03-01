import { describe, expect, it, vi } from 'vitest';
import { InputSystem } from '../game/systems/InputSystem';
import type { PointerState } from '../game/infrastructure/adapters/BrowserInputAdapter';
import type { WorldState } from '../game/domain/world/WorldState';
import type { BrowserInputAdapter } from '../game/infrastructure/adapters/BrowserInputAdapter';

class MockInput {
  private keyDownListeners: Array<(_event: KeyboardEvent) => void> = [];
  private pointerMoveListeners: Array<(_pointer: PointerState) => void> = [];
  private pointerDownListeners: Array<(_pointer: PointerState) => void> = [];
  private pointerUpListeners: Array<(_pointer: PointerState) => void> = [];
  private pointerCancelListeners: Array<(_pointer: PointerState) => void> = [];
  private keys = new Set<string>();

  setKeyDown(code: string, down: boolean): void {
    if (down) {
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  onKeyDown(listener: (_event: KeyboardEvent) => void): () => void {
    this.keyDownListeners.push(listener);
    return () => {
      this.keyDownListeners = this.keyDownListeners.filter((entry) => entry !== listener);
    };
  }

  emitKeyDown(event: KeyboardEvent): void {
    this.keyDownListeners.forEach((listener) => listener(event));
  }

  onPointerMove(listener: (_pointer: PointerState) => void): () => void {
    this.pointerMoveListeners.push(listener);
    return () => {
      this.pointerMoveListeners = this.pointerMoveListeners.filter((entry) => entry !== listener);
    };
  }

  onPointerDown(listener: (_pointer: PointerState) => void): () => void {
    this.pointerDownListeners.push(listener);
    return () => {
      this.pointerDownListeners = this.pointerDownListeners.filter((entry) => entry !== listener);
    };
  }

  onPointerUp(listener: (_pointer: PointerState) => void): () => void {
    this.pointerUpListeners.push(listener);
    return () => {
      this.pointerUpListeners = this.pointerUpListeners.filter((entry) => entry !== listener);
    };
  }

  onPointerCancel(listener: (_pointer: PointerState) => void): () => void {
    this.pointerCancelListeners.push(listener);
    return () => {
      this.pointerCancelListeners = this.pointerCancelListeners.filter((entry) => entry !== listener);
    };
  }

  emitPointerDown(pointer: PointerState): void {
    this.pointerDownListeners.forEach((listener) => listener(pointer));
  }

  emitPointerMove(pointer: PointerState): void {
    this.pointerMoveListeners.forEach((listener) => listener(pointer));
  }

  emitPointerUp(pointer: PointerState): void {
    this.pointerUpListeners.forEach((listener) => listener(pointer));
  }

  emitPointerCancel(pointer: PointerState): void {
    this.pointerCancelListeners.forEach((listener) => listener(pointer));
  }
}

function pointer(overrides: Partial<PointerState> = {}): PointerState {
  return {
    x: 0,
    y: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    ...overrides,
  };
}

function createWorld(): WorldState {
  return {
    pacman: {
      direction: {
        current: 'left',
        next: 'left',
      },
    },
    ghosts: [],
    collisionDebugEnabled: false,
    hoveredDebugTile: null,
    debugPanelText: '',
    pointerScreen: null,
    isMoving: true,
  } as unknown as WorldState;
}

function createHarness(): {
  input: MockInput;
  world: WorldState;
  togglePause: ReturnType<typeof vi.fn>;
  system: InputSystem;
} {
  const input = new MockInput();
  const world = createWorld();
  const togglePause = vi.fn();
  const system = new InputSystem(input as unknown as BrowserInputAdapter, world, { togglePause });
  system.start();

  return { input, world, togglePause, system };
}

describe('InputSystem', () => {
  it('toggles pause on keyboard Space code and legacy Spacebar key', () => {
    const { input, togglePause } = createHarness();

    const spacePreventDefault = vi.fn();
    input.emitKeyDown({
      code: 'Space',
      key: ' ',
      repeat: false,
      preventDefault: spacePreventDefault,
    } as unknown as KeyboardEvent);

    const legacySpacePreventDefault = vi.fn();
    input.emitKeyDown({
      code: 'Unidentified',
      key: 'Spacebar',
      repeat: false,
      preventDefault: legacySpacePreventDefault,
    } as unknown as KeyboardEvent);

    expect(togglePause).toHaveBeenCalledTimes(2);
    expect(spacePreventDefault).toHaveBeenCalledTimes(1);
    expect(legacySpacePreventDefault).toHaveBeenCalledTimes(1);
  });

  it('prevents default browser behavior for directional arrow keys', () => {
    const { input, togglePause } = createHarness();

    const preventDefault = vi.fn();
    input.emitKeyDown({
      code: 'ArrowUp',
      key: 'ArrowUp',
      repeat: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(togglePause).toHaveBeenCalledTimes(0);
  });

  it('commits swipe direction only after threshold and axis lock', () => {
    const { input, world, togglePause } = createHarness();

    input.emitPointerDown(pointer({ x: 10, y: 10 }));

    input.emitPointerMove(pointer({ x: 24, y: 14 }));
    expect(world.pacman.direction.next).toBe('left');

    input.emitPointerMove(pointer({ x: 29, y: 26 }));
    expect(world.pacman.direction.next).toBe('left');

    input.emitPointerMove(pointer({ x: 40, y: 15 }));
    expect(world.pacman.direction.next).toBe('right');

    input.emitPointerUp(pointer({ x: 40, y: 15 }));
    expect(togglePause).toHaveBeenCalledTimes(0);
  });

  it('maps vertical swipes to up/down direction', () => {
    const { input, world } = createHarness();

    input.emitPointerDown(pointer({ x: 20, y: 40 }));
    input.emitPointerMove(pointer({ x: 24, y: 70 }));
    expect(world.pacman.direction.next).toBe('down');

    input.emitPointerUp(pointer({ x: 24, y: 70 }));
    input.emitPointerDown(pointer({ pointerId: 2, x: 24, y: 70 }));
    input.emitPointerMove(pointer({ pointerId: 2, x: 20, y: 42 }));
    expect(world.pacman.direction.next).toBe('up');
  });

  it('toggles pause on touch tap to pause', () => {
    const { input, togglePause } = createHarness();

    input.emitPointerDown(pointer({ x: 12, y: 12 }));
    input.emitPointerUp(pointer({ x: 14, y: 13 }));

    expect(togglePause).toHaveBeenCalledTimes(1);
  });

  it('toggles pause on touch tap to resume', () => {
    const { input, world, togglePause } = createHarness();
    world.isMoving = false;

    input.emitPointerDown(pointer({ x: 30, y: 30 }));
    input.emitPointerUp(pointer({ x: 33, y: 31 }));

    expect(togglePause).toHaveBeenCalledTimes(1);
  });

  it('resumes paused touch input immediately on pointer down', () => {
    const { input, world, togglePause } = createHarness();
    world.isMoving = false;

    input.emitPointerDown(pointer({ x: 30, y: 30 }));
    expect(togglePause).toHaveBeenCalledTimes(1);

    input.emitPointerUp(pointer({ x: 31, y: 31 }));
    expect(togglePause).toHaveBeenCalledTimes(1);
  });

  it('never toggles pause for swipe gestures', () => {
    const { input, world, togglePause } = createHarness();

    input.emitPointerDown(pointer({ x: 20, y: 20 }));
    input.emitPointerMove(pointer({ x: 48, y: 22 }));
    input.emitPointerUp(pointer({ x: 48, y: 22 }));

    expect(world.pacman.direction.next).toBe('right');
    expect(togglePause).toHaveBeenCalledTimes(0);
  });

  it('cleans up touch gesture state on pointer cancel', () => {
    const { input, togglePause } = createHarness();

    input.emitPointerDown(pointer({ pointerId: 11, x: 20, y: 20 }));
    input.emitPointerCancel(pointer({ pointerId: 11, x: 22, y: 21 }));
    input.emitPointerUp(pointer({ pointerId: 11, x: 22, y: 21 }));

    expect(togglePause).toHaveBeenCalledTimes(0);

    input.emitPointerDown(pointer({ pointerId: 12, x: 30, y: 30 }));
    input.emitPointerUp(pointer({ pointerId: 12, x: 31, y: 31 }));

    expect(togglePause).toHaveBeenCalledTimes(1);
  });

  it('gives keyboard directional input priority over swipe until keys are released', () => {
    const { input, world } = createHarness();

    input.setKeyDown('ArrowUp', true);
    input.emitPointerDown(pointer({ x: 10, y: 10 }));
    input.emitPointerMove(pointer({ x: 10, y: 60 }));
    expect(world.pacman.direction.next).toBe('left');

    input.setKeyDown('ArrowUp', false);
    input.emitPointerMove(pointer({ x: 10, y: 60 }));
    expect(world.pacman.direction.next).toBe('down');
  });

  it('keeps desktop pointerdown pause toggle behavior unchanged', () => {
    const { input, togglePause } = createHarness();

    input.emitPointerDown(pointer({ pointerType: 'mouse', isPrimary: true }));
    expect(togglePause).toHaveBeenCalledTimes(1);

    input.emitPointerUp(pointer({ pointerType: 'mouse', isPrimary: true }));
    expect(togglePause).toHaveBeenCalledTimes(1);
  });
});
