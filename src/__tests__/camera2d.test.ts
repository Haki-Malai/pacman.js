import { describe, expect, it } from 'vitest';
import { Camera2D } from '../engine/camera';

describe('Camera2D', () => {
  it('snaps to follow target immediately on startup and clamps to bounds', () => {
    const camera = new Camera2D();
    const target = { x: 80, y: 80 };

    camera.setBounds(100, 100);
    camera.setViewport(50, 50);
    camera.setZoom(1);
    camera.startFollow(target, 0.09, 0.09);
    camera.snapToFollowTarget();

    expect(camera.x).toBe(50);
    expect(camera.y).toBe(50);
  });

  it('keeps normal interpolation behavior after startup snap', () => {
    const camera = new Camera2D();
    const target = { x: 150, y: 100 };

    camera.setBounds(300, 200);
    camera.setViewport(100, 100);
    camera.setZoom(1);
    camera.startFollow(target, 0.1, 0.1);
    camera.snapToFollowTarget();

    expect(camera.x).toBe(100);
    expect(camera.y).toBe(50);

    target.x = 190;
    target.y = 130;
    camera.update();

    expect(camera.x).toBeCloseTo(104, 5);
    expect(camera.y).toBeCloseTo(53, 5);
  });

  it('clamps camera coordinates while following near world edges', () => {
    const camera = new Camera2D();
    const target = { x: -100, y: -100 };

    camera.setBounds(100, 100);
    camera.setViewport(80, 80);
    camera.setZoom(1);
    camera.startFollow(target, 1, 1);

    camera.update();
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);

    target.x = 500;
    target.y = 500;
    camera.update();

    expect(camera.x).toBe(20);
    expect(camera.y).toBe(20);
  });
});
