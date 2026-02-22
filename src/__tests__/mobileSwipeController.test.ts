/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MobileSwipeController,
  resolveSwipeDirection,
  resolveSwipeDirectionWithLock,
} from '../game/infrastructure/adapters/MobileSwipeController';

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
  init: {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
  },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  Object.defineProperty(event, 'clientY', { value: init.clientY });
  target.dispatchEvent(event);
}

describe('resolveSwipeDirection', () => {
  it('returns null when movement is inside the dead zone', () => {
    expect(resolveSwipeDirection(4, 3, 6)).toBeNull();
  });

  it('returns horizontal direction when horizontal movement dominates', () => {
    expect(resolveSwipeDirection(18, 7, 3)).toBe('right');
    expect(resolveSwipeDirection(-18, 7, 3)).toBe('left');
  });

  it('returns vertical direction when vertical movement dominates', () => {
    expect(resolveSwipeDirection(6, -15, 3)).toBe('up');
    expect(resolveSwipeDirection(6, 15, 3)).toBe('down');
  });
});

describe('resolveSwipeDirectionWithLock', () => {
  it('keeps the current direction when movement falls back inside the dead zone', () => {
    expect(
      resolveSwipeDirectionWithLock({
        currentDirection: 'right',
        deltaX: 3,
        deltaY: 2,
        deadZonePx: 8,
        switchDistancePx: 12,
        directionLockRatio: 1.25,
      }),
    ).toBe('right');
  });

  it('prevents noisy perpendicular switches when movement is not dominant enough', () => {
    expect(
      resolveSwipeDirectionWithLock({
        currentDirection: 'right',
        deltaX: 14,
        deltaY: 15,
        deadZonePx: 8,
        switchDistancePx: 12,
        directionLockRatio: 1.25,
      }),
    ).toBe('right');
  });

  it('allows deliberate perpendicular switches once lock conditions are met', () => {
    expect(
      resolveSwipeDirectionWithLock({
        currentDirection: 'right',
        deltaX: 8,
        deltaY: 20,
        deadZonePx: 8,
        switchDistancePx: 12,
        directionLockRatio: 1.25,
      }),
    ).toBe('down');
  });

  it('allows reversing direction on the same axis without perpendicular lock checks', () => {
    expect(
      resolveSwipeDirectionWithLock({
        currentDirection: 'right',
        deltaX: -16,
        deltaY: 3,
        deadZonePx: 8,
        switchDistancePx: 12,
        directionLockRatio: 1.25,
      }),
    ).toBe('left');
  });
});

describe('MobileSwipeController', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('tracks touch pointer lifecycle and resets on pointer up', () => {
    const mediaQuery = createMediaQueryStub(true);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const element = document.createElement('div');
    document.body.append(element);

    const capturedPointers = new Set<number>();
    const setPointerCaptureSpy = vi.fn((pointerId: number) => {
      capturedPointers.add(pointerId);
    });
    const releasePointerCaptureSpy = vi.fn((pointerId: number) => {
      capturedPointers.delete(pointerId);
    });

    element.setPointerCapture = setPointerCaptureSpy;
    element.hasPointerCapture = vi.fn((pointerId: number) => capturedPointers.has(pointerId));
    element.releasePointerCapture = releasePointerCaptureSpy;

    const controller = new MobileSwipeController(element);

    dispatchPointerEvent(element, 'pointerdown', {
      pointerId: 11,
      pointerType: 'touch',
      clientX: 10,
      clientY: 20,
    });

    dispatchPointerEvent(element, 'pointermove', {
      pointerId: 11,
      pointerType: 'touch',
      clientX: 60,
      clientY: 20,
    });

    expect(controller.getDirection()).toBe('right');
    expect(setPointerCaptureSpy).toHaveBeenCalledWith(11);

    dispatchPointerEvent(element, 'pointerup', {
      pointerId: 11,
      pointerType: 'touch',
      clientX: 60,
      clientY: 20,
    });

    expect(controller.getDirection()).toBeNull();
    expect(releasePointerCaptureSpy).toHaveBeenCalledWith(11);

    controller.destroy();
  });

  it('ignores non-touch pointers and resets when media-query support turns off', () => {
    const mediaQuery = createMediaQueryStub(true);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const element = document.createElement('div');
    document.body.append(element);

    const capturedPointers = new Set<number>();
    element.setPointerCapture = vi.fn((pointerId: number) => {
      capturedPointers.add(pointerId);
    });
    element.hasPointerCapture = vi.fn((pointerId: number) => capturedPointers.has(pointerId));
    element.releasePointerCapture = vi.fn((pointerId: number) => {
      capturedPointers.delete(pointerId);
    });

    const controller = new MobileSwipeController(element);

    dispatchPointerEvent(element, 'pointerdown', {
      pointerId: 4,
      pointerType: 'mouse',
      clientX: 10,
      clientY: 10,
    });
    dispatchPointerEvent(element, 'pointermove', {
      pointerId: 4,
      pointerType: 'mouse',
      clientX: 80,
      clientY: 10,
    });

    expect(controller.getDirection()).toBeNull();

    dispatchPointerEvent(element, 'pointerdown', {
      pointerId: 5,
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    dispatchPointerEvent(element, 'pointermove', {
      pointerId: 5,
      pointerType: 'touch',
      clientX: 10,
      clientY: 80,
    });

    expect(controller.getDirection()).toBe('down');

    mediaQuery.setMatches(false);

    expect(controller.isEnabled()).toBe(false);
    expect(controller.getDirection()).toBeNull();

    controller.destroy();
  });
});
