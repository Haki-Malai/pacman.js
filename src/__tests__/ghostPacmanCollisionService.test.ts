import { describe, expect, it } from 'vitest';
import { GhostEntity } from '../game/domain/entities/GhostEntity';
import {
  findFirstCollision,
  isSameTileContact,
  isTileCrossingContact,
} from '../game/domain/services/GhostPacmanCollisionService';

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

describe('GhostPacmanCollisionService', () => {
  it('detects same-tile contact', () => {
    const ghost = makeGhost({ x: 10, y: 4 });

    const collision = findFirstCollision({
      pacmanCurrent: { x: 10, y: 4 },
      pacmanPrevious: { x: 10, y: 3 },
      ghosts: [ghost],
      ghostPreviousTiles: new Map([[ghost, { x: 10, y: 4 }]]),
    });

    expect(collision?.contact).toBe('same-tile');
    expect(collision?.outcome).toBe('pacman-hit');
    expect(isSameTileContact({
      pacmanCurrent: { x: 10, y: 4 },
      pacmanPrevious: { x: 10, y: 3 },
      ghostCurrent: ghost.tile,
      ghostPrevious: { x: 10, y: 4 },
    })).toBe(true);
  });

  it('detects tile-crossing contact', () => {
    const ghost = makeGhost({ x: 6, y: 3 });

    const collision = findFirstCollision({
      pacmanCurrent: { x: 6, y: 2 },
      pacmanPrevious: { x: 6, y: 3 },
      ghosts: [ghost],
      ghostPreviousTiles: new Map([[ghost, { x: 6, y: 2 }]]),
    });

    expect(collision?.contact).toBe('tile-crossing');
    expect(
      isTileCrossingContact({
        pacmanCurrent: { x: 6, y: 2 },
        pacmanPrevious: { x: 6, y: 3 },
        ghostCurrent: { x: 6, y: 3 },
        ghostPrevious: { x: 6, y: 2 },
      }),
    ).toBe(true);
  });

  it('returns null when no contact exists', () => {
    const ghost = makeGhost({ x: 1, y: 1 });

    const collision = findFirstCollision({
      pacmanCurrent: { x: 4, y: 4 },
      pacmanPrevious: { x: 4, y: 4 },
      ghosts: [ghost],
      ghostPreviousTiles: new Map([[ghost, { x: 1, y: 1 }]]),
    });

    expect(collision).toBeNull();
  });

  it('returns the first collision deterministically in ghost list order', () => {
    const first = makeGhost({ x: 7, y: 7 });
    const second = makeGhost({ x: 7, y: 7 });

    const collision = findFirstCollision({
      pacmanCurrent: { x: 7, y: 7 },
      pacmanPrevious: { x: 7, y: 6 },
      ghosts: [first, second],
      ghostPreviousTiles: new Map([
        [first, { x: 7, y: 7 }],
        [second, { x: 7, y: 7 }],
      ]),
    });

    expect(collision?.ghost).toBe(first);
  });

  it('defaults to ghost-hit outcome when collision ghost is scared', () => {
    const ghost = makeGhost({ x: 5, y: 5 });
    ghost.state.scared = true;

    const collision = findFirstCollision({
      pacmanCurrent: { x: 5, y: 5 },
      pacmanPrevious: { x: 5, y: 4 },
      ghosts: [ghost],
      ghostPreviousTiles: new Map([[ghost, { x: 5, y: 5 }]]),
    });

    expect(collision?.outcome).toBe('ghost-hit');
  });

  it('supports an overridable outcome resolver for future ghost-hit behavior', () => {
    const ghost = makeGhost({ x: 3, y: 3 });

    const collision = findFirstCollision({
      pacmanCurrent: { x: 3, y: 3 },
      pacmanPrevious: { x: 3, y: 2 },
      ghosts: [ghost],
      ghostPreviousTiles: new Map(),
      resolveOutcome: () => 'ghost-hit',
    });

    expect(collision?.outcome).toBe('ghost-hit');
  });
});
