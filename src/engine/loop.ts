import { advanceFixedStep, FixedStepState } from './fixedStep';

type UpdateCallback = (_deltaMs: number) => void;
type RenderCallback = (_alpha: number) => void;

export class FixedStepLoop {
  private readonly stepMs: number;
  private readonly maxSubSteps: number;
  private readonly update: UpdateCallback;
  private readonly render: RenderCallback;
  private readonly state: FixedStepState = { accumulatorMs: 0 };

  private running = false;
  private lastTimestamp = 0;
  private frameId = 0;

  constructor(update: UpdateCallback, render: RenderCallback, stepMs = 1000 / 60, maxSubSteps = 8) {
    this.update = update;
    this.render = render;
    this.stepMs = stepMs;
    this.maxSubSteps = maxSubSteps;
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTimestamp = 0;
    this.state.accumulatorMs = 0;
    this.frameId = window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    window.cancelAnimationFrame(this.frameId);
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    const result = advanceFixedStep(this.state, deltaMs, this.stepMs, this.maxSubSteps);
    this.state.accumulatorMs = result.accumulatorMs;

    for (let i = 0; i < result.ticks; i += 1) {
      this.update(this.stepMs);
    }

    const alpha = this.stepMs > 0 ? this.state.accumulatorMs / this.stepMs : 0;
    this.render(alpha);

    this.frameId = window.requestAnimationFrame(this.tick);
  };
}
