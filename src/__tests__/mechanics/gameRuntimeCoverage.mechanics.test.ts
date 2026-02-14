import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCompositionRoot } from '../../game/app/GameCompositionRoot';
import { GameRuntime } from '../../game/app/GameRuntime';
import { ComposedGame } from '../../game/app/contracts';

function createComposedGame() {
  const start = vi.fn();
  const update = vi.fn();
  const pausedUpdate = vi.fn();
  const render = vi.fn();
  const updateDestroy = vi.fn();
  const pausedDestroy = vi.fn();
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
    updateSystems: [
      { start, update, destroy: updateDestroy },
      { runsWhenPaused: true, update: pausedUpdate, destroy: pausedDestroy },
    ],
    renderSystems: [{ render, destroy: renderDestroy }],
    destroy: vi.fn(),
  };

  return {
    composed,
    spies: {
      start,
      update,
      pausedUpdate,
      render,
      updateDestroy,
      pausedDestroy,
      renderDestroy,
      scheduler,
      input,
      world,
    },
  };
}

describe('game runtime coverage', () => {
  let nextFrame: ((_timestamp: number) => void) | null = null;
  let frameId = 0;

  beforeEach(() => {
    nextFrame = null;
    frameId = 0;

    vi.stubGlobal('window', {
      requestAnimationFrame: vi.fn((callback: (_timestamp: number) => void) => {
        nextFrame = callback;
        frameId += 1;
        return frameId;
      }),
      cancelAnimationFrame: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('covers start, no-op pause/resume before start, and destroy idempotency', async () => {
    const { composed, spies } = createComposedGame();
    const composeSpy = vi.fn().mockResolvedValue(composed);
    const compositionRoot = {
      compose: composeSpy,
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);

    runtime.pause();
    runtime.resume();

    await runtime.start();
    await runtime.start();

    expect(composeSpy).toHaveBeenCalledOnce();
    expect(spies.start).toHaveBeenCalledOnce();

    runtime.destroy();
    runtime.destroy();
    await runtime.start();

    expect(spies.scheduler.clear).toHaveBeenCalledOnce();
    expect(spies.input.destroy).toHaveBeenCalledOnce();
    expect(composed.destroy).toHaveBeenCalledOnce();
  });

  it('covers paused update pathway, runtime control toggle, and update/render guards', async () => {
    const { composed, spies } = createComposedGame();
    const composeSpy = vi.fn().mockResolvedValue(composed);
    const compositionRoot = {
      compose: composeSpy,
    } as unknown as GameCompositionRoot;

    const runtime = new GameRuntime(compositionRoot);
    await runtime.start();

    nextFrame?.(1);
    nextFrame?.(20);

    runtime.pause();
    nextFrame?.(40);

    expect(spies.pausedUpdate).toHaveBeenCalled();
    expect(spies.update).toHaveBeenCalled();

    const internals = runtime as unknown as {
      runtimeControl: { togglePause: () => void };
      update: (_deltaMs: number) => void;
      render: (_alpha: number) => void;
      composed: ComposedGame | null;
      destroyed: boolean;
    };

    internals.runtimeControl.togglePause();
    expect(spies.world.isMoving).toBe(true);

    internals.runtimeControl.togglePause();
    expect(spies.world.isMoving).toBe(false);

    internals.composed = null;
    internals.runtimeControl.togglePause();
    internals.update(16);
    internals.render(0.5);

    internals.composed = composed;
    internals.destroyed = true;
    internals.update(16);
    internals.render(0.5);
    internals.destroyed = false;

    runtime.destroy();
    expect(composeSpy).toHaveBeenCalledOnce();

    const win = globalThis.window as unknown as {
      cancelAnimationFrame: ReturnType<typeof vi.fn>;
    };
    expect(win.cancelAnimationFrame).toHaveBeenCalled();
  });
});
