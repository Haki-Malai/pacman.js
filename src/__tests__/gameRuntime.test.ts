import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GameRuntime } from '../game/app/GameRuntime';
import { ComposedGame } from '../game/app/contracts';
import { GameCompositionRoot } from '../game/app/GameCompositionRoot';

type EventCallback = (_event?: Event) => void;

function createComposedGame() {
  const start = vi.fn();
  const update = vi.fn();
  const render = vi.fn();
  const updateDestroy = vi.fn();
  const renderDestroy = vi.fn();

  const scheduler = {
    update: vi.fn(),
    setPaused: vi.fn(),
    clear: vi.fn(),
  };

  const input = {
    destroy: vi.fn(),
  };

  const world = {
    isMoving: true,
    nextTick: vi.fn(),
  };

  const composed: ComposedGame = {
    world: world as never,
    renderer: {} as never,
    input: input as never,
    scheduler: scheduler as never,
    updateSystems: [{ start, update, destroy: updateDestroy }],
    renderSystems: [{ render, destroy: renderDestroy }],
    destroy: vi.fn(),
  };

  return {
    composed,
    spies: {
      start,
      update,
      render,
      updateDestroy,
      renderDestroy,
      scheduler,
      input,
      world,
    },
  };
}

describe('GameRuntime', () => {
  let nextFrame: ((_timestamp: number) => void) | null = null;
  let frameId = 0;
  let emitWindowEvent: (_type: 'blur' | 'focus') => void;
  let emitVisibilityChange: () => void;
  let setDocumentHidden: (_hidden: boolean) => void;
  let windowAddEventListener: ReturnType<typeof vi.fn>;
  let windowRemoveEventListener: ReturnType<typeof vi.fn>;
  let documentAddEventListener: ReturnType<typeof vi.fn>;
  let documentRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextFrame = null;
    frameId = 0;
    const windowListeners = new Map<string, Set<EventCallback>>();
    const documentListeners = new Map<string, Set<EventCallback>>();
    const documentState = { hidden: false };

    const registerListener = (listeners: Map<string, Set<EventCallback>>, type: string, listener: EventCallback): void => {
      const entries = listeners.get(type) ?? new Set<EventCallback>();
      entries.add(listener);
      listeners.set(type, entries);
    };
    const unregisterListener = (listeners: Map<string, Set<EventCallback>>, type: string, listener: EventCallback): void => {
      const entries = listeners.get(type);
      if (!entries) {
        return;
      }
      entries.delete(listener);
      if (entries.size === 0) {
        listeners.delete(type);
      }
    };
    const emitListeners = (listeners: Map<string, Set<EventCallback>>, type: string): void => {
      listeners.get(type)?.forEach((listener) => {
        listener({ type } as Event);
      });
    };

    windowAddEventListener = vi.fn((type: string, listener: EventCallback) => {
      registerListener(windowListeners, type, listener);
    });
    windowRemoveEventListener = vi.fn((type: string, listener: EventCallback) => {
      unregisterListener(windowListeners, type, listener);
    });

    documentAddEventListener = vi.fn((type: string, listener: EventCallback) => {
      registerListener(documentListeners, type, listener);
    });
    documentRemoveEventListener = vi.fn((type: string, listener: EventCallback) => {
      unregisterListener(documentListeners, type, listener);
    });

    vi.stubGlobal('window', {
      requestAnimationFrame: vi.fn((callback: (_timestamp: number) => void) => {
        nextFrame = callback;
        frameId += 1;
        return frameId;
      }),
      cancelAnimationFrame: vi.fn(),
      addEventListener: windowAddEventListener,
      removeEventListener: windowRemoveEventListener,
    });

    vi.stubGlobal('document', {
      get hidden(): boolean {
        return documentState.hidden;
      },
      addEventListener: documentAddEventListener,
      removeEventListener: documentRemoveEventListener,
    });

    emitWindowEvent = (type: 'blur' | 'focus') => {
      emitListeners(windowListeners, type);
    };
    emitVisibilityChange = () => {
      emitListeners(documentListeners, 'visibilitychange');
    };
    setDocumentHidden = (hidden: boolean) => {
      documentState.hidden = hidden;
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts composed systems and drives update/render during animation frames', async () => {
    const { composed, spies } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    expect(spies.start).toHaveBeenCalledOnce();
    expect(nextFrame).not.toBeNull();

    nextFrame?.(1);
    nextFrame?.(20);

    expect(spies.world.nextTick).toHaveBeenCalled();
    expect(spies.scheduler.update).toHaveBeenCalled();
    expect(spies.update).toHaveBeenCalled();
    expect(spies.render).toHaveBeenCalled();
  });

  it('pauses and resumes movement while keeping the loop alive', async () => {
    const { composed, spies } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    runtime.pause();
    expect(spies.world.isMoving).toBe(false);
    expect(spies.scheduler.setPaused).toHaveBeenCalledWith(true);

    runtime.resume();
    expect(spies.world.isMoving).toBe(true);
    expect(spies.scheduler.setPaused).toHaveBeenCalledWith(false);
  });

  it('auto-pauses on window blur and auto-resumes on focus when pause was focus-caused', async () => {
    const { composed, spies } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    emitWindowEvent('blur');
    expect(spies.world.isMoving).toBe(false);
    expect(spies.scheduler.setPaused).toHaveBeenLastCalledWith(true);

    emitWindowEvent('focus');
    expect(spies.world.isMoving).toBe(true);
    expect(spies.scheduler.setPaused).toHaveBeenLastCalledWith(false);
  });

  it('auto-pauses on hidden visibility and auto-resumes when visible again', async () => {
    const { composed, spies } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    setDocumentHidden(true);
    emitVisibilityChange();
    expect(spies.world.isMoving).toBe(false);
    expect(spies.scheduler.setPaused).toHaveBeenLastCalledWith(true);

    setDocumentHidden(false);
    emitVisibilityChange();
    expect(spies.world.isMoving).toBe(true);
    expect(spies.scheduler.setPaused).toHaveBeenLastCalledWith(false);
  });

  it('does not auto-resume when the runtime was manually paused before focus loss', async () => {
    const { composed, spies } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    runtime.pause();
    expect(spies.world.isMoving).toBe(false);

    emitWindowEvent('blur');
    emitWindowEvent('focus');
    setDocumentHidden(true);
    emitVisibilityChange();
    setDocumentHidden(false);
    emitVisibilityChange();

    expect(spies.world.isMoving).toBe(false);
    expect(spies.scheduler.setPaused).toHaveBeenCalledTimes(1);
    expect(spies.scheduler.setPaused).toHaveBeenCalledWith(true);
  });

  it('destroys loop resources and composed systems exactly once', async () => {
    const { composed, spies } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    runtime.destroy();

    expect(spies.scheduler.clear).toHaveBeenCalledOnce();
    expect(spies.input.destroy).toHaveBeenCalledOnce();
    expect(spies.updateDestroy).toHaveBeenCalledOnce();
    expect(spies.renderDestroy).toHaveBeenCalledOnce();
    expect(composed.destroy).toHaveBeenCalledOnce();

    const win = globalThis.window as unknown as {
      cancelAnimationFrame: ReturnType<typeof vi.fn>;
    };
    expect(win.cancelAnimationFrame).toHaveBeenCalled();
    expect(windowRemoveEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(windowRemoveEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(documentRemoveEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('registers focus listeners only once when start is called repeatedly', async () => {
    const { composed } = createComposedGame();
    const compositionRoot = {
      compose: vi.fn().mockResolvedValue(composed),
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();
    await runtime.start();

    expect(windowAddEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(windowAddEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(documentAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(windowAddEventListener).toHaveBeenCalledTimes(2);
    expect(documentAddEventListener).toHaveBeenCalledTimes(1);
  });
});
