import { describe, expect, it } from 'vitest';
import { TimerManager } from '../engine/timer';
import { TweenManager } from '../engine/tween';

describe('TimerManager', () => {
  it('respects pause/resume while advancing delayed calls', () => {
    const timers = new TimerManager();
    let fired = 0;

    timers.delayedCall(100, () => {
      fired += 1;
    });

    timers.update(50);
    expect(fired).toBe(0);

    timers.setPaused(true);
    timers.update(500);
    expect(fired).toBe(0);

    timers.setPaused(false);
    timers.update(49);
    expect(fired).toBe(0);

    timers.update(1);
    expect(fired).toBe(1);
  });
});

describe('TweenManager', () => {
  it('freezes tween progression while paused and resumes from the same value', () => {
    const tweens = new TweenManager();
    const target = { x: 0 };

    tweens.add({
      target,
      to: { x: 10 },
      durationMs: 100,
      ease: 'linear',
    });

    tweens.update(50);
    expect(target.x).toBeCloseTo(5, 5);

    tweens.setPaused(true);
    tweens.update(1000);
    expect(target.x).toBeCloseTo(5, 5);

    tweens.setPaused(false);
    tweens.update(50);
    expect(target.x).toBeCloseTo(10, 5);
  });
});
