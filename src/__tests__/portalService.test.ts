import { describe, expect, it } from 'vitest';
import { PortalService } from '../game/domain/services/PortalService';
import { CollisionGrid, CollisionTile } from '../game/domain/world/CollisionGrid';
import { PortalPair } from '../game/domain/world/WorldState';

const openTile = (): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

const wallTile = (): CollisionTile => ({
  collides: true,
  penGate: false,
  portal: false,
  up: true,
  down: true,
  left: true,
  right: true,
});

describe('PortalService', () => {
  it('teleports centered entities between paired portals and prevents same-tick bounce', () => {
    const grid = new CollisionGrid([
      [openTile(), openTile(), openTile()],
      [
        { ...openTile(), portal: true },
        openTile(),
        { ...openTile(), portal: true },
      ],
      [openTile(), openTile(), openTile()],
    ]);

    const portals = new PortalService(grid);
    const entity = { tile: { x: 0, y: 1 }, moved: { x: 0, y: 0 }, direction: 'right' };

    const firstTeleport = portals.tryTeleport(entity, grid, 10);
    const secondTeleportSameTick = portals.tryTeleport(entity, grid, 10);

    expect(firstTeleport).toBe(true);
    expect(entity.tile).toEqual({ x: 2, y: 1 });
    expect(entity.direction).toBe('right');
    expect(secondTeleportSameTick).toBe(false);
  });

  it('does not teleport when destination portal tile is blocked', () => {
    const destinationPortal = { ...wallTile(), portal: true };
    const grid = new CollisionGrid([
      [openTile(), openTile(), openTile()],
      [{ ...openTile(), portal: true }, openTile(), destinationPortal],
      [openTile(), openTile(), openTile()],
    ]);

    const portals = new PortalService(grid);
    const entity = { tile: { x: 0, y: 1 }, moved: { x: 0, y: 0 } };

    const moved = portals.tryTeleport(entity, grid, 22);

    expect(moved).toBe(false);
    expect(entity.tile).toEqual({ x: 0, y: 1 });
  });

  it('uses explicit portal pairs when multiple production endpoints exist', () => {
    const grid = new CollisionGrid([
      [openTile(), { ...openTile(), portal: true }, openTile()],
      [{ ...openTile(), portal: true }, openTile(), { ...openTile(), portal: true }],
      [openTile(), { ...openTile(), portal: true }, openTile()],
    ]);

    const explicitPairs: PortalPair[] = [
      { from: { x: 0, y: 1 }, to: { x: 2, y: 1 } },
      { from: { x: 1, y: 0 }, to: { x: 1, y: 2 } },
    ];

    const portals = new PortalService(grid, explicitPairs);
    const horizontalEntity = { tile: { x: 0, y: 1 }, moved: { x: 0, y: 0 } };
    const verticalEntity = { tile: { x: 1, y: 0 }, moved: { x: 0, y: 0 } };

    const movedHorizontal = portals.tryTeleport(horizontalEntity, grid, 30);
    const movedVertical = portals.tryTeleport(verticalEntity, grid, 31);

    expect(movedHorizontal).toBe(true);
    expect(horizontalEntity.tile).toEqual({ x: 2, y: 1 });
    expect(movedVertical).toBe(true);
    expect(verticalEntity.tile).toEqual({ x: 1, y: 2 });
  });
});
