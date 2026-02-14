import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GameRuntime } from '../game/app/GameRuntime';
import { ComposedGame } from '../game/app/contracts';
import { GameCompositionRoot } from '../game/app/GameCompositionRoot';

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
  });
});
