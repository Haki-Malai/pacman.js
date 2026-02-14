import { TilePosition } from '../valueObjects/TilePosition';
import { CollisionGrid } from '../world/CollisionGrid';

interface PortalTrackedEntity {
  tile: TilePosition;
  moved: { x: number; y: number };
}

function tileKey(tile: TilePosition): string {
  return `${tile.x},${tile.y}`;
}

export class PortalService {
  private readonly portalPairs = new Map<string, TilePosition>();
  private readonly lastTeleportTick = new WeakMap<object, number>();

  constructor(collisionGrid: CollisionGrid) {
    const portals: TilePosition[] = [];
    for (let y = 0; y < collisionGrid.height; y += 1) {
      for (let x = 0; x < collisionGrid.width; x += 1) {
        const tile = collisionGrid.getTileAt(x, y);
        if (tile.portal) {
          portals.push({ x, y });
        }
      }
    }

    for (let i = 0; i + 1 < portals.length; i += 2) {
      const from = portals[i];
      const to = portals[i + 1];
      this.portalPairs.set(tileKey(from), { ...to });
      this.portalPairs.set(tileKey(to), { ...from });
    }
  }

  tryTeleport(entity: PortalTrackedEntity, collisionGrid: CollisionGrid, tick: number): boolean {
    if (entity.moved.x !== 0 || entity.moved.y !== 0) {
      return false;
    }

    if (this.lastTeleportTick.get(entity) === tick) {
      return false;
    }

    const sourceKey = tileKey(entity.tile);
    const destination = this.portalPairs.get(sourceKey);
    if (!destination) {
      return false;
    }

    const targetCollision = collisionGrid.getTileAt(destination.x, destination.y);
    if (
      targetCollision.collides &&
      targetCollision.up &&
      targetCollision.right &&
      targetCollision.down &&
      targetCollision.left
    ) {
      return false;
    }

    entity.tile = { ...destination };
    entity.moved.x = 0;
    entity.moved.y = 0;
    this.lastTeleportTick.set(entity, tick);
    return true;
  }
}
