/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PacmanExperienceRuntime } from '../ui/shell/PacmanExperienceRuntime';
import type { PacmanRuntime } from '../ui/shell/contracts';

interface RuntimeStub {
  runtime: PacmanRuntime;
  startSpy: ReturnType<typeof vi.fn<() => Promise<void>>>;
  pauseSpy: ReturnType<typeof vi.fn<() => void>>;
  resumeSpy: ReturnType<typeof vi.fn<() => void>>;
  destroySpy: ReturnType<typeof vi.fn<() => void>>;
}

function dispatchPointerDown(target: Element): void {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
}

async function revealMenuActions(root: HTMLElement): Promise<void> {
  dispatchPointerDown(root);
  await vi.advanceTimersByTimeAsync(4_000);
}

function createRuntimeStub(startImpl: () => Promise<void> = () => Promise.resolve()): RuntimeStub {
  const startSpy = vi.fn(startImpl);
  const pauseSpy = vi.fn();
  const resumeSpy = vi.fn();
  const destroySpy = vi.fn();

  return {
    runtime: {
      start: startSpy,
      pause: pauseSpy,
      resume: resumeSpy,
      destroy: destroySpy,
    },
    startSpy,
    pauseSpy,
    resumeSpy,
    destroySpy,
  };
}

describe('PacmanExperienceRuntime', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('mounts the shell and forwards lifecycle calls to the started game runtime', async () => {
    vi.useFakeTimers();

    const mount = document.createElement('div');
    mount.id = 'runtime-root';
    document.body.append(mount);

    const game = createRuntimeStub();
    const createGame = vi.fn(() => game.runtime);

    const experience = new PacmanExperienceRuntime({
      mountId: 'runtime-root',
      createGame,
    });

    await experience.start();

    expect(mount.classList.contains('pacman-shell-root')).toBe(true);
    expect(mount.querySelector('#runtime-root-runtime-host')).toBeTruthy();

    const menuRoot = mount.querySelector('.legacy-menu-root');
    const startButton = mount.querySelector<HTMLButtonElement>('.legacy-menu-button--start');

    expect(menuRoot).toBeTruthy();
    expect(startButton).toBeTruthy();

    await revealMenuActions(menuRoot as HTMLElement);
    startButton?.click();

    await vi.advanceTimersByTimeAsync(950);
    await Promise.resolve();

    expect(createGame).toHaveBeenCalledWith({ mountId: 'runtime-root-runtime-host' });
    expect(game.startSpy).toHaveBeenCalledTimes(1);
    expect(mount.querySelector('.legacy-menu-root')).toBeNull();

    experience.pause();
    experience.resume();

    expect(game.pauseSpy).toHaveBeenCalledTimes(1);
    expect(game.resumeSpy).toHaveBeenCalledTimes(1);

    experience.destroy();

    expect(game.destroySpy).toHaveBeenCalledTimes(1);
    expect(mount.childElementCount).toBe(0);
    expect(mount.classList.contains('pacman-shell-root')).toBe(false);
  });

  it('keeps the menu active after startup failure and allows retry', async () => {
    vi.useFakeTimers();

    const mount = document.createElement('div');
    mount.id = 'retry-root';
    document.body.append(mount);

    const failedGame = createRuntimeStub(() => Promise.reject(new Error('boot failed')));
    const successfulGame = createRuntimeStub();

    const createGame = vi
      .fn(() => failedGame.runtime)
      .mockReturnValueOnce(failedGame.runtime)
      .mockReturnValueOnce(successfulGame.runtime);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const experience = new PacmanExperienceRuntime({
      mountId: 'retry-root',
      createGame,
    });

    await experience.start();

    const menuRoot = mount.querySelector('.legacy-menu-root');
    const startButton = mount.querySelector<HTMLButtonElement>('.legacy-menu-button--start');
    const statusLabel = mount.querySelector('.legacy-menu-status');

    await revealMenuActions(menuRoot as HTMLElement);

    startButton?.click();
    await vi.advanceTimersByTimeAsync(950);
    await Promise.resolve();

    expect(failedGame.startSpy).toHaveBeenCalledTimes(1);
    expect(failedGame.destroySpy).toHaveBeenCalledTimes(1);
    expect((menuRoot as HTMLElement).dataset.stage).toBe('menu');
    expect(statusLabel?.textContent).toContain('Could not start the game');

    startButton?.click();
    await vi.advanceTimersByTimeAsync(950);
    await Promise.resolve();

    expect(successfulGame.startSpy).toHaveBeenCalledTimes(1);
    expect(mount.querySelector('.legacy-menu-root')).toBeNull();

    experience.destroy();
    consoleErrorSpy.mockRestore();
  });

  it('autostarts the runtime without mounting dormant fullscreen/orientation shell controls', async () => {
    const mount = document.createElement('div');
    mount.id = 'auto-start-root';
    document.body.append(mount);

    const game = createRuntimeStub();

    const experience = new PacmanExperienceRuntime({
      mountId: 'auto-start-root',
      createGame: () => game.runtime,
      autoStart: true,
    });

    await experience.start();

    expect(game.startSpy).toHaveBeenCalledTimes(1);
    expect(mount.querySelector('.legacy-menu-root')).toBeNull();
    expect(mount.querySelector('.pacman-fullscreen-toggle')).toBeNull();
    expect(mount.querySelector('.mobile-orientation-guard')).toBeNull();

    experience.destroy();
  });
});
