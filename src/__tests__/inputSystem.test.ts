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

describe('InputSystem', () => {
  it('maps touch swipe to direction with axis lock and threshold', () => {
    const input = new MockInput();
    const world = createWorld();
    const togglePause = vi.fn();
    const system = new InputSystem(input as unknown as BrowserInputAdapter, world, { togglePause });
    system.start();

    input.emitPointerDown(pointer({ x: 10, y: 10 }));
    input.emitPointerMove(pointer({ x: 24, y: 14 }));
    expect(world.pacman.direction.next).toBe('left');

    input.emitPointerMove(pointer({ x: 40, y: 15 }));
    expect(world.pacman.direction.next).toBe('right');
    input.emitPointerUp(pointer({ x: 40, y: 15 }));
    expect(togglePause).toHaveBeenCalledTimes(0);
  });

  it('does not commit swipe when keyboard directional input is active', () => {
    const input = new MockInput();
    const world = createWorld();
    const togglePause = vi.fn();
    const system = new InputSystem(input as unknown as BrowserInputAdapter, world, { togglePause });
    system.start();

    input.setKeyDown('ArrowUp', true);
    input.emitPointerDown(pointer({ x: 10, y: 10 }));
    input.emitPointerMove(pointer({ x: 10, y: 60 }));

    expect(world.pacman.direction.next).toBe('left');
  });

  it('clears active swipe on pointerup so next swipe can commit', () => {
    const input = new MockInput();
    const world = createWorld();
    const togglePause = vi.fn();
    const system = new InputSystem(input as unknown as BrowserInputAdapter, world, { togglePause });
    system.start();

    input.emitPointerDown(pointer({ pointerId: 11, x: 20, y: 20 }));
    input.emitPointerMove(pointer({ pointerId: 11, x: 50, y: 20 }));
    expect(world.pacman.direction.next).toBe('right');

    input.emitPointerUp(pointer({ pointerId: 11 }));
    input.emitPointerDown(pointer({ pointerId: 12, x: 50, y: 50 }));
    input.emitPointerMove(pointer({ pointerId: 12, x: 50, y: 20 }));
    expect(world.pacman.direction.next).toBe('up');
  });

  it('toggles pause on touch tap gesture', () => {
    const input = new MockInput();
    const world = createWorld();
    const togglePause = vi.fn();
    const system = new InputSystem(input as unknown as BrowserInputAdapter, world, { togglePause });
    system.start();

    input.emitPointerDown(pointer({ x: 12, y: 12 }));
    input.emitPointerUp(pointer({ x: 14, y: 13 }));

    expect(togglePause).toHaveBeenCalledTimes(1);
  });

  it('keeps desktop pointerdown pause toggle behavior', () => {
    const input = new MockInput();
    const world = createWorld();
    const togglePause = vi.fn();
    const system = new InputSystem(input as unknown as BrowserInputAdapter, world, { togglePause });
    system.start();

    input.emitPointerDown(pointer({ pointerType: 'mouse', isPrimary: true }));
    expect(togglePause).toHaveBeenCalledTimes(1);
  });
});
