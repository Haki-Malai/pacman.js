/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { LegacyMenuController } from '../ui/menu/LegacyMenuController';

function dispatchPointerDown(target: Element): void {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
}

describe('LegacyMenuController', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('progresses through intro phases and shows menu actions', async () => {
    vi.useFakeTimers();

    const mount = document.createElement('div');
    document.body.append(mount);

    const controller = new LegacyMenuController({
      mount,
      onStartRequested: () => Promise.resolve(),
    });

    const root = mount.querySelector('.legacy-menu-root');
    const statusLabel = mount.querySelector('.legacy-menu-status');
    const optionsButton = mount.querySelector<HTMLButtonElement>('.legacy-menu-button--options');
    const exitButton = mount.querySelector<HTMLButtonElement>('.legacy-menu-button--exit');

    expect(root).toBeTruthy();
    expect(statusLabel).toBeTruthy();
    expect(optionsButton).toBeTruthy();
    expect(exitButton).toBeTruthy();

    dispatchPointerDown(root as Element);

    expect((root as HTMLElement).dataset.stage).toBe('intro');
    expect(statusLabel?.textContent).toContain('Initializing intro sequence');

    await vi.advanceTimersByTimeAsync(2_000);
    expect((root as HTMLElement).dataset.introPhase).toBe('bye');

    await vi.advanceTimersByTimeAsync(1_500);
    expect((root as HTMLElement).dataset.introPhase).toBe('hidden');

    await vi.advanceTimersByTimeAsync(500);
    expect((root as HTMLElement).dataset.stage).toBe('menu');

    optionsButton?.click();
    expect(statusLabel?.textContent).toContain('Options panel is planned');

    exitButton?.click();
    expect(statusLabel?.textContent).toContain('Exit is unavailable');

    controller.destroy();
  });

  it('resets to menu when start request fails and allows retry', async () => {
    vi.useFakeTimers();

    const mount = document.createElement('div');
    document.body.append(mount);

    const onStartRequested = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('startup failed'))
      .mockResolvedValueOnce(undefined);

    new LegacyMenuController({
      mount,
      onStartRequested,
    });

    const root = mount.querySelector('.legacy-menu-root');
    const startButton = mount.querySelector<HTMLButtonElement>('.legacy-menu-button--start');
    const statusLabel = mount.querySelector('.legacy-menu-status');

    dispatchPointerDown(root as Element);
    await vi.advanceTimersByTimeAsync(4_000);

    startButton?.click();
    expect((root as HTMLElement).dataset.stage).toBe('starting');
    expect(startButton?.disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(950);
    await Promise.resolve();

    expect(onStartRequested).toHaveBeenCalledTimes(1);
    expect((root as HTMLElement).dataset.stage).toBe('menu');
    expect(startButton?.disabled).toBe(false);
    expect(statusLabel?.textContent).toContain('Could not start the game');

    startButton?.click();
    await vi.advanceTimersByTimeAsync(950);
    await Promise.resolve();

    expect(onStartRequested).toHaveBeenCalledTimes(2);
    expect(mount.querySelector('.legacy-menu-root')).toBeNull();
  });
});
