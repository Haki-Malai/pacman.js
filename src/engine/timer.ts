export interface TimerHandle {
  active: boolean;
  paused: boolean;
  cancel: () => void;
}

type TimerEntry = TimerHandle & {
  delayMs: number;
  elapsedMs: number;
  callback: () => void;
};

export class TimerManager {
  private readonly timers = new Set<TimerEntry>();
  private paused = false;

  delayedCall(delayMs: number, callback: () => void): TimerHandle {
    const entry: TimerEntry = {
      active: true,
      paused: false,
      delayMs,
      elapsedMs: 0,
      callback,
      cancel: () => {
        entry.active = false;
        this.timers.delete(entry);
      },
    };

    this.timers.add(entry);
    return entry;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  update(deltaMs: number): void {
    if (this.paused || deltaMs <= 0) {
      return;
    }

    const entries = Array.from(this.timers);
    entries.forEach((entry) => {
      if (!entry.active || entry.paused) {
        return;
      }

      entry.elapsedMs += deltaMs;
      if (entry.elapsedMs < entry.delayMs) {
        return;
      }

      entry.active = false;
      this.timers.delete(entry);
      entry.callback();
    });
  }

  clear(): void {
    this.timers.forEach((entry) => {
      entry.active = false;
    });
    this.timers.clear();
  }
}
