import { describe, expect, it } from 'vitest';
import { advanceFixedStep, FixedStepState } from '../engine/fixedStep';

describe('advanceFixedStep', () => {
  it('accumulates small deltas and emits a tick once enough time has passed', () => {
    const state: FixedStepState = { accumulatorMs: 0 };

    const first = advanceFixedStep(state, 10, 16.6667, 8);
    expect(first.ticks).toBe(0);
    expect(first.accumulatorMs).toBeCloseTo(10, 4);

    const second = advanceFixedStep({ accumulatorMs: first.accumulatorMs }, 10, 16.6667, 8);
    expect(second.ticks).toBe(1);
    expect(second.accumulatorMs).toBeCloseTo(3.3333, 3);
  });

  it('caps oversized frame deltas to avoid runaway sub-steps', () => {
    const state: FixedStepState = { accumulatorMs: 0 };

    const result = advanceFixedStep(state, 250, 16, 4);

    expect(result.clampedDeltaMs).toBe(64);
    expect(result.ticks).toBe(4);
    expect(result.accumulatorMs).toBe(0);
  });
});
