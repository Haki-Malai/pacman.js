export interface FixedStepState {
  accumulatorMs: number;
}

export interface FixedStepAdvanceResult {
  ticks: number;
  accumulatorMs: number;
  clampedDeltaMs: number;
}

export function advanceFixedStep(
  state: FixedStepState,
  frameDeltaMs: number,
  stepMs: number,
  maxSubSteps = 8,
): FixedStepAdvanceResult {
  const safeDelta = Number.isFinite(frameDeltaMs) && frameDeltaMs > 0 ? frameDeltaMs : 0;
  const maxDelta = stepMs * maxSubSteps;
  const clampedDeltaMs = safeDelta > maxDelta ? maxDelta : safeDelta;

  let accumulatorMs = state.accumulatorMs + clampedDeltaMs;
  let ticks = 0;

  while (accumulatorMs >= stepMs && ticks < maxSubSteps) {
    accumulatorMs -= stepMs;
    ticks += 1;
  }

  if (ticks === maxSubSteps && accumulatorMs >= stepMs) {
    accumulatorMs = 0;
  }

  return {
    ticks,
    accumulatorMs,
    clampedDeltaMs,
  };
}
