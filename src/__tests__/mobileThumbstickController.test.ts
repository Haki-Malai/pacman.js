/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MobileThumbstickController,
  resolveThumbstickDirection,
} from '../game/infrastructure/adapters/MobileThumbstickController';

interface MediaQueryListStub extends MediaQueryList {
  setMatches: (_matches: boolean) => void;
}

function createMediaQueryStub(initialMatches: boolean): MediaQueryListStub {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQuery = {
    matches: initialMatches,
    media: '(hover: none) and (pointer: coarse)',
    onchange: null as ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as (_event: MediaQueryListEvent) => void);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as (_event: MediaQueryListEvent) => void);
    },
    addListener: (listener: (_event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (_event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
    setMatches: (matches: boolean) => {
      mediaQuery.matches = matches;
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent;
      listeners.forEach((listener) => {
        listener(event);
      });
      mediaQuery.onchange?.call(mediaQuery, event);
    },
  } satisfies MediaQueryListStub;

  return mediaQuery;
}

function dispatchPointerEvent(
  target: EventTarget,
  type: string,
  init: { pointerId: number; clientX: number; clientY: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  Object.defineProperty(event, 'clientY', { value: init.clientY });
  target.dispatchEvent(event);
}

describe('resolveThumbstickDirection', () => {
  it('returns null when movement is inside the dead zone', () => {
    expect(resolveThumbstickDirection(4, 3, 6)).toBeNull();
  });

  it('returns horizontal direction when horizontal movement dominates', () => {
    expect(resolveThumbstickDirection(18, 7, 3)).toBe('right');
    expect(resolveThumbstickDirection(-18, 7, 3)).toBe('left');
  });

  it('returns vertical direction when vertical movement dominates', () => {
    expect(resolveThumbstickDirection(6, -15, 3)).toBe('up');
    expect(resolveThumbstickDirection(6, 15, 3)).toBe('down');
  });
});

describe('MobileThumbstickController', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('tracks pointer lifecycle and resets on pointer up', () => {
    const mediaQuery = createMediaQueryStub(true);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const mount = document.createElement('div');
    document.body.append(mount);

    const controller = new MobileThumbstickController(mount);

    const root = mount.firstElementChild as HTMLElement;
    const pad = root.firstElementChild as HTMLDivElement;
    const knob = pad.firstElementChild as HTMLDivElement;

    expect(root.style.display).toBe('flex');
    expect(controller.getDirection()).toBeNull();

    const capturedPointers = new Set<number>();
    const setPointerCaptureSpy = vi.fn((pointerId: number) => {
      capturedPointers.add(pointerId);
    });
    const releasePointerCaptureSpy = vi.fn((pointerId: number) => {
      capturedPointers.delete(pointerId);
    });

    pad.setPointerCapture = setPointerCaptureSpy;
    pad.hasPointerCapture = vi.fn((pointerId: number) => capturedPointers.has(pointerId));
    pad.releasePointerCapture = releasePointerCaptureSpy;
    vi.spyOn(pad, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      width: 132,
      height: 132,
      right: 132,
      bottom: 132,
      toJSON: () => '',
    });

    dispatchPointerEvent(pad, 'pointerdown', { pointerId: 7, clientX: 66, clientY: 66 });
    dispatchPointerEvent(pad, 'pointermove', { pointerId: 7, clientX: 122, clientY: 66 });

    expect(controller.getDirection()).toBe('right');
    expect(setPointerCaptureSpy).toHaveBeenCalledWith(7);

    dispatchPointerEvent(pad, 'pointerup', { pointerId: 7, clientX: 122, clientY: 66 });

    expect(controller.getDirection()).toBeNull();
    expect(knob.style.transform).toContain('0px');
    expect(releasePointerCaptureSpy).toHaveBeenCalledWith(7);

    controller.destroy();
  });

  it('disables and resets state when coarse-pointer media query turns off', () => {
    const mediaQuery = createMediaQueryStub(true);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const mount = document.createElement('div');
    document.body.append(mount);

    const controller = new MobileThumbstickController(mount);
    const root = mount.firstElementChild as HTMLElement;
    const pad = root.firstElementChild as HTMLDivElement;

    const capturedPointers = new Set<number>();
    pad.setPointerCapture = vi.fn((pointerId: number) => {
      capturedPointers.add(pointerId);
    });
    pad.hasPointerCapture = vi.fn((pointerId: number) => capturedPointers.has(pointerId));
    pad.releasePointerCapture = vi.fn((pointerId: number) => {
      capturedPointers.delete(pointerId);
    });
    vi.spyOn(pad, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      width: 132,
      height: 132,
      right: 132,
      bottom: 132,
      toJSON: () => '',
    });

    dispatchPointerEvent(pad, 'pointerdown', { pointerId: 2, clientX: 66, clientY: 66 });
    dispatchPointerEvent(pad, 'pointermove', { pointerId: 2, clientX: 14, clientY: 66 });
    expect(controller.getDirection()).toBe('left');

    mediaQuery.setMatches(false);

    expect(root.style.display).toBe('none');
    expect(controller.getDirection()).toBeNull();

    mediaQuery.setMatches(true);

    expect(root.style.display).toBe('flex');

    controller.destroy();
  });
});
