import { describe, expect, it } from 'vitest';

import {
  resolveSwipeDirection,
  resolveSwipeDirectionWithLock,
} from '../game/infrastructure/adapters/MobileSwipeController';

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
