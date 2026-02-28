import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PauseOverlaySystem } from '../game/systems/PauseOverlaySystem';
import { WorldState } from '../game/domain/world/WorldState';
import { FakeDocument } from './helpers/fakeDom';

describe('PauseOverlaySystem', () => {
  let fakeDocument: FakeDocument;

  beforeEach(() => {
    fakeDocument = new FakeDocument();
    vi.stubGlobal('document', fakeDocument as unknown as Document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies mount pause classes and toggles overlay visibility/aria with pause state', () => {
    const mount = fakeDocument.createElement('div');
    fakeDocument.body.appendChild(mount);

    const world = { isMoving: true } as WorldState;
    const system = new PauseOverlaySystem(world, mount as unknown as HTMLElement);

    system.start();

    const overlay = mount.querySelector('[data-pause-overlay]');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay?.classList.contains('opacity-100')).toBe(false);
    expect(mount.classList.contains('grayscale')).toBe(false);

    world.isMoving = false;
    system.update();

    expect(mount.classList.contains('grayscale')).toBe(true);
    expect(mount.classList.contains('sepia')).toBe(true);
    expect(mount.classList.contains('saturate-50')).toBe(true);
    expect(mount.classList.contains('brightness-90')).toBe(true);
    expect(mount.classList.contains('contrast-100')).toBe(true);
    expect(mount.style.filter.length).toBeGreaterThan(0);
    expect(overlay?.classList.contains('opacity-100')).toBe(true);
    expect(overlay?.getAttribute('aria-hidden')).toBe('false');

    world.isMoving = true;
    system.update();

    expect(mount.classList.contains('grayscale')).toBe(false);
    expect(mount.classList.contains('sepia')).toBe(false);
    expect(mount.classList.contains('saturate-50')).toBe(false);
    expect(mount.classList.contains('brightness-90')).toBe(false);
    expect(mount.classList.contains('contrast-100')).toBe(false);
    expect(mount.style.filter).toBe('');
    expect(overlay?.classList.contains('opacity-100')).toBe(false);
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');

    system.destroy();
    expect(mount.querySelector('[data-pause-overlay]')).toBeNull();
  });
});
