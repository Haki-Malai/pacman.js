import { describe, expect, it } from 'vitest';

import { resolveThumbstickDirection } from '../game/infrastructure/adapters/MobileThumbstickController';

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
