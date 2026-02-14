import { describe, expect, it } from 'vitest';
import {
  FLIPPED_ANTI_DIAGONAL,
  FLIPPED_HORIZONTAL,
  FLIPPED_VERTICAL,
  orientCollisionTile,
  parseGid,
} from '../game/map/tiled';
import { CollisionTile } from '../types';

const tile = (overrides: Partial<CollisionTile> = {}): CollisionTile => ({
  collides: true,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
  ...overrides,
});

describe('parseGid', () => {
  it('matches Phaser rotation/flip decoding for all Tiled flag combinations', () => {
    const combos = [
      { flags: 0, rotation: 0, flipped: false },
      { flags: FLIPPED_HORIZONTAL, rotation: 0, flipped: true },
      { flags: FLIPPED_VERTICAL, rotation: Math.PI, flipped: true },
      { flags: FLIPPED_ANTI_DIAGONAL, rotation: (3 * Math.PI) / 2, flipped: true },
      { flags: FLIPPED_HORIZONTAL | FLIPPED_VERTICAL, rotation: Math.PI, flipped: false },
      { flags: FLIPPED_HORIZONTAL | FLIPPED_ANTI_DIAGONAL, rotation: Math.PI / 2, flipped: false },
      { flags: FLIPPED_VERTICAL | FLIPPED_ANTI_DIAGONAL, rotation: (3 * Math.PI) / 2, flipped: false },
      { flags: FLIPPED_HORIZONTAL | FLIPPED_VERTICAL | FLIPPED_ANTI_DIAGONAL, rotation: Math.PI / 2, flipped: true },
    ];

    combos.forEach((entry) => {
      const rawGid = entry.flags | 123;
      const parsed = parseGid(rawGid);

      expect(parsed.gid).toBe(123);
      expect(parsed.rotation).toBe(entry.rotation);
      expect(parsed.flipped).toBe(entry.flipped);
    });
  });
});

describe('orientCollisionTile', () => {
  it('rotates edges clockwise in 90-degree steps', () => {
    const base = tile({ up: true });

    const rotated90 = orientCollisionTile(base, Math.PI / 2, false, false);
    const rotated180 = orientCollisionTile(base, Math.PI, false, false);
    const rotated270 = orientCollisionTile(base, (3 * Math.PI) / 2, false, false);

    expect(rotated90).toMatchObject({ up: false, right: true, down: false, left: false });
    expect(rotated180).toMatchObject({ up: false, right: false, down: true, left: false });
    expect(rotated270).toMatchObject({ up: false, right: false, down: false, left: true });
  });

  it('applies horizontal flip before rotation, matching Phaser tile orientation flow', () => {
    const base = tile({ left: true, right: false, up: false, down: true });

    const oriented = orientCollisionTile(base, Math.PI / 2, true, false);

    expect(oriented).toMatchObject({ up: false, right: false, down: true, left: true });
  });
});
