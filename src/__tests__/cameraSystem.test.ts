import { describe, expect, it } from 'vitest';
import { computeContainZoom, resolveCameraZoom } from '../game/systems/CameraSystem';

describe('computeContainZoom', () => {
  it('returns the scale required to fit world bounds in portrait', () => {
    const zoom = computeContainZoom(390, 844, 816, 816);
    expect(zoom).toBeCloseTo(390 / 816, 6);
  });

  it('returns the scale required to fit world bounds in landscape', () => {
    const zoom = computeContainZoom(844, 390, 816, 816);
    expect(zoom).toBeCloseTo(390 / 816, 6);
  });
});

describe('resolveCameraZoom', () => {
  it('keeps desktop zoom for non-coarse pointers', () => {
    const zoom = resolveCameraZoom({
      viewportWidth: 390,
      viewportHeight: 844,
      worldWidth: 816,
      worldHeight: 816,
      defaultZoom: 5,
      coarsePointer: false,
    });

    expect(zoom).toBe(5);
  });

  it('keeps default zoom for coarse-pointer mobile input (no forced zoom-out)', () => {
    const zoom = resolveCameraZoom({
      viewportWidth: 390,
      viewportHeight: 844,
      worldWidth: 816,
      worldHeight: 816,
      defaultZoom: 5,
      coarsePointer: true,
    });

    expect(zoom).toBe(5);
  });
});
