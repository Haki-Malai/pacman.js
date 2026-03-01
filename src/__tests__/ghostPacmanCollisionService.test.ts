import { describe, expect, it } from 'vitest';
import { GhostEntity } from '../game/domain/entities/GhostEntity';
import {
  findFirstCollision,
  isPixelMaskOverlap,
} from '../game/domain/services/GhostPacmanCollisionService';
import { CollisionMaskFrame, CollisionMaskSample } from '../game/domain/valueObjects/CollisionMask';

function makeGhost(tile: { x: number; y: number }): GhostEntity {
  return new GhostEntity({
    key: 'inky',
    tile,
    direction: 'left',
    speed: 1,
    displayWidth: 11,
    displayHeight: 11,
  });
}

function makeMask(width: number, height: number, opaqueIndices: number[]): CollisionMaskFrame {
  const opaque = new Uint8Array(width * height);
  opaqueIndices.forEach((index) => {
    if (index >= 0 && index < opaque.length) {
      opaque[index] = 1;
    }
  });

  return {
    width,
    height,
    opaque,
  };
}

function makeSample(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  mask: CollisionMaskFrame;
  angle?: number;
  flipX?: boolean;
  flipY?: boolean;
}): CollisionMaskSample {
  return {
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    angle: params.angle ?? 0,
    flipX: params.flipX ?? false,
    flipY: params.flipY ?? false,
    mask: params.mask,
  };
}

describe('GhostPacmanCollisionService', () => {
  it('detects collision when opaque mask pixels overlap', () => {
    const ghost = makeGhost({ x: 10, y: 4 });
    const fullMask = makeMask(3, 3, [0, 1, 2, 3, 4, 5, 6, 7, 8]);

    const collision = findFirstCollision({
      pacman: makeSample({ x: 10, y: 10, width: 3, height: 3, mask: fullMask }),
      ghosts: [
        {
          ghost,
          sample: makeSample({ x: 10, y: 10, width: 3, height: 3, mask: fullMask }),
        },
      ],
    });

    expect(collision?.contact).toBe('pixel-mask-overlap');
    expect(collision?.outcome).toBe('pacman-hit');
  });

  it('returns null when only transparent pixels overlap', () => {
    const ghost = makeGhost({ x: 4, y: 4 });
    const transparentMask = makeMask(4, 4, []);

    const collision = findFirstCollision({
      pacman: makeSample({ x: 8, y: 8, width: 4, height: 4, mask: transparentMask }),
      ghosts: [
        {
          ghost,
          sample: makeSample({ x: 8, y: 8, width: 4, height: 4, mask: transparentMask }),
        },
      ],
    });

    expect(collision).toBeNull();
  });

  it('applies rotation and flip transforms during overlap detection', () => {
    const rotationPacmanMask = makeMask(4, 2, [7]);
    const rotationGhostMask = makeMask(4, 2, [0]);
    const rotationPacman = makeSample({ x: 20, y: 20, width: 4, height: 2, mask: rotationPacmanMask });
    const rotationGhostNoTransform = makeSample({ x: 20, y: 20, width: 4, height: 2, mask: rotationGhostMask });
    const rotationGhostRotated = makeSample({
      x: 20,
      y: 20,
      width: 4,
      height: 2,
      mask: rotationGhostMask,
      angle: 180,
    });

    const flipPacmanMask = makeMask(4, 2, [3]);
    const flipGhostMask = makeMask(4, 2, [0]);
    const flipPacman = makeSample({ x: 20, y: 20, width: 4, height: 2, mask: flipPacmanMask });
    const flipGhostNoTransform = makeSample({ x: 20, y: 20, width: 4, height: 2, mask: flipGhostMask });
    const flipGhostFlipped = makeSample({ x: 20, y: 20, width: 4, height: 2, mask: flipGhostMask, flipX: true });

    expect(isPixelMaskOverlap(rotationPacman, rotationGhostNoTransform)).toBe(false);
    expect(isPixelMaskOverlap(rotationPacman, rotationGhostRotated)).toBe(true);
    expect(isPixelMaskOverlap(flipPacman, flipGhostNoTransform)).toBe(false);
    expect(isPixelMaskOverlap(flipPacman, flipGhostFlipped)).toBe(true);
  });

  it('returns the first collision deterministically in ghost list order', () => {
    const first = makeGhost({ x: 7, y: 7 });
    const second = makeGhost({ x: 7, y: 7 });
    const fullMask = makeMask(2, 2, [0, 1, 2, 3]);

    const collision = findFirstCollision({
      pacman: makeSample({ x: 7, y: 7, width: 2, height: 2, mask: fullMask }),
      ghosts: [
        {
          ghost: first,
          sample: makeSample({ x: 7, y: 7, width: 2, height: 2, mask: fullMask }),
        },
        {
          ghost: second,
          sample: makeSample({ x: 7, y: 7, width: 2, height: 2, mask: fullMask }),
        },
      ],
    });

    expect(collision?.ghost).toBe(first);
  });

  it('defaults to ghost-hit outcome when collision ghost is scared', () => {
    const ghost = makeGhost({ x: 5, y: 5 });
    ghost.state.scared = true;
    const fullMask = makeMask(2, 2, [0, 1, 2, 3]);

    const collision = findFirstCollision({
      pacman: makeSample({ x: 5, y: 5, width: 2, height: 2, mask: fullMask }),
      ghosts: [
        {
          ghost,
          sample: makeSample({ x: 5, y: 5, width: 2, height: 2, mask: fullMask }),
        },
      ],
    });

    expect(collision?.outcome).toBe('ghost-hit');
  });

  it('supports an overridable outcome resolver for future ghost-hit behavior', () => {
    const ghost = makeGhost({ x: 3, y: 3 });
    const fullMask = makeMask(2, 2, [0, 1, 2, 3]);

    const collision = findFirstCollision({
      pacman: makeSample({ x: 3, y: 3, width: 2, height: 2, mask: fullMask }),
      ghosts: [
        {
          ghost,
          sample: makeSample({ x: 3, y: 3, width: 2, height: 2, mask: fullMask }),
        },
      ],
      resolveOutcome: () => 'ghost-hit',
    });

    expect(collision?.outcome).toBe('ghost-hit');
  });

  it('does not report collision for tile swap without overlapping mask pixels', () => {
    const ghost = makeGhost({ x: 6, y: 6 });
    const pacmanMask = makeMask(2, 2, [0]);
    const ghostMask = makeMask(2, 2, [3]);

    const collision = findFirstCollision({
      pacman: makeSample({ x: 16, y: 16, width: 2, height: 2, mask: pacmanMask }),
      ghosts: [
        {
          ghost,
          sample: makeSample({ x: 16, y: 16, width: 2, height: 2, mask: ghostMask }),
        },
      ],
    });

    expect(collision).toBeNull();
  });
});
