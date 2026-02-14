import { TimerHandle, TimerManager } from '../../../engine/timer';
import { TweenConfig, TweenHandle, TweenManager, TweenTarget } from '../../../engine/tween';

export class TimerSchedulerAdapter {
  private readonly timers = new TimerManager();
  private readonly tweens = new TweenManager();

  delayedCall(delayMs: number, callback: () => void): TimerHandle {
    return this.timers.delayedCall(delayMs, callback);
  }

  addTween<T extends TweenTarget>(config: TweenConfig<T>): TweenHandle {
    return this.tweens.add(config);
  }

  update(deltaMs: number): void {
    this.timers.update(deltaMs);
    this.tweens.update(deltaMs);
  }

  setPaused(paused: boolean): void {
    this.timers.setPaused(paused);
    this.tweens.setPaused(paused);
  }

  clear(): void {
    this.timers.clear();
    this.tweens.clear();
  }
}
