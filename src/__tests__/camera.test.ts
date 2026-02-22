import { describe, expect, it } from 'vitest';
import { Camera2D } from '../engine/camera';

describe('Camera2D bounds clamping', () => {
  it('centers the world when viewport is larger than world bounds', () => {
    const camera = new Camera2D();
    camera.setBounds(100, 80);
    camera.setZoom(1);
    camera.setViewport(200, 160);

    expect(camera.x).toBe(-50);
    expect(camera.y).toBe(-40);
  });

  it('clamps inside world bounds when viewport is smaller than world', () => {
    const camera = new Camera2D();
    camera.setBounds(200, 120);
    camera.setZoom(1);
    camera.setViewport(100, 100);

    camera.x = 999;
    camera.y = -999;
    camera.update();

    expect(camera.x).toBe(100);
    expect(camera.y).toBe(0);
  });
});
