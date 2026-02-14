export type EaseName = 'linear' | 'sineInOut';

export interface TweenHandle {
  active: boolean;
  paused: boolean;
  cancel: () => void;
}

export type TweenTarget = object;

export interface TweenConfig<T extends TweenTarget> {
  target: T;
  to: Record<string, number>;
  durationMs: number;
  ease?: EaseName;
  onComplete?: () => void;
}

type TweenEntry<T extends TweenTarget = TweenTarget> = TweenHandle & {
  target: T;
  from: Record<string, number>;
  to: Record<string, number>;
  durationMs: number;
  elapsedMs: number;
  ease: EaseName;
  onComplete?: () => void;
};

const applyEase = (name: EaseName, t: number): number => {
  if (name === 'sineInOut') {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }
  return t;
};

export class TweenManager {
  private readonly tweens = new Set<TweenEntry>();
  private paused = false;

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  add<T extends TweenTarget>(config: TweenConfig<T>): TweenHandle {
    const targetValues = config.target as Record<string, unknown>;
    const from: Record<string, number> = {};
    Object.keys(config.to).forEach((key) => {
      const currentValue = targetValues[key];
      from[key] = typeof currentValue === 'number' ? currentValue : 0;
    });

    const entry: TweenEntry<T> = {
      active: true,
      paused: false,
      target: config.target,
      from,
      to: config.to,
      durationMs: Math.max(1, config.durationMs),
      elapsedMs: 0,
      ease: config.ease ?? 'linear',
      onComplete: config.onComplete,
      cancel: () => {
        entry.active = false;
        this.tweens.delete(entry);
      },
    };

    this.tweens.add(entry as TweenEntry);
    return entry;
  }

  update(deltaMs: number): void {
    if (this.paused || deltaMs <= 0) {
      return;
    }

    const entries = Array.from(this.tweens);
    entries.forEach((entry) => {
      if (!entry.active || entry.paused) {
        return;
      }

      entry.elapsedMs += deltaMs;
      const normalized = Math.min(1, entry.elapsedMs / entry.durationMs);
      const eased = applyEase(entry.ease, normalized);

      Object.keys(entry.to).forEach((key) => {
        const start = entry.from[key] ?? 0;
        const end = entry.to[key] ?? start;
        (entry.target as Record<string, unknown>)[key] = start + (end - start) * eased;
      });

      if (normalized >= 1) {
        entry.active = false;
        this.tweens.delete(entry);
        entry.onComplete?.();
      }
    });
  }

  clear(): void {
    this.tweens.forEach((entry) => {
      entry.active = false;
    });
    this.tweens.clear();
  }
}
