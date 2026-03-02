import { TilePosition } from '../valueObjects/TilePosition';
import { Direction } from '../valueObjects/Direction';
import { PortalPair } from '../world/WorldState';
import { CollisionGrid } from '../world/CollisionGrid';

interface PortalTrackedEntity {
  tile: TilePosition;
  moved: { x: number; y: number };
  direction?: unknown;
}

function tileKey(tile: TilePosition): string {
  return `${tile.x},${tile.y}`;
}

interface PortalLink {
  destination: TilePosition;
  outwardDirection?: Direction;
}

export class PortalService {
  private readonly portalPairs = new Map<string, PortalLink>();
  private readonly lastTeleportTick = new WeakMap<object, number>();

  constructor(collisionGrid: CollisionGrid, explicitPortalPairs: PortalPair[] = []) {
    if (explicitPortalPairs.length > 0) {
      explicitPortalPairs.forEach((pair) => {
        this.setPortalPair(pair.from, pair.to);
      });
      return;
    }

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
      this.setPortalPair(from, to);
    }
  }

  tryTeleport(entity: PortalTrackedEntity, collisionGrid: CollisionGrid, tick: number): boolean {
    const sourceKey = tileKey(entity.tile);
    if (this.lastTeleportTick.get(entity) === tick) {
      return false;
    }

    const portalLink = this.portalPairs.get(sourceKey);
    if (!portalLink) {
      return false;
    }

    const direction = this.resolveEntityDirection(entity);
    if (!this.canTeleportFromPortalTile(entity, portalLink.outwardDirection, direction)) {
      return false;
    }

    const destination = portalLink.destination;
    const targetCollision = collisionGrid.getTileAt(destination.x, destination.y);
    if (this.isFullyBlocking(targetCollision)) {
      return false;
    }

    entity.tile = { ...destination };
    entity.moved.x = 0;
    entity.moved.y = 0;
    this.lastTeleportTick.set(entity, tick);
    return true;
  }

  private setPortalPair(from: TilePosition, to: TilePosition): void {
    this.portalPairs.set(tileKey(from), {
      destination: { ...to },
      outwardDirection: this.resolveOutwardDirection(from, to),
    });
    this.portalPairs.set(tileKey(to), {
      destination: { ...from },
      outwardDirection: this.resolveOutwardDirection(to, from),
    });
  }

  private resolveEntityDirection(entity: PortalTrackedEntity): Direction | undefined {
    if (this.isDirection(entity.direction)) {
      return entity.direction;
    }

    if (!this.isRecord(entity.direction)) {
      return undefined;
    }

    const current = entity.direction.current;
    return this.isDirection(current) ? current : undefined;
  }

  private resolveOutwardDirection(source: TilePosition, destination: TilePosition): Direction | undefined {
    if (source.x === destination.x) {
      return source.y < destination.y ? 'up' : 'down';
    }

    if (source.y === destination.y) {
      return source.x < destination.x ? 'left' : 'right';
    }

    return undefined;
  }

  private canTeleportFromPortalTile(
    entity: PortalTrackedEntity,
    outwardDirection: Direction | undefined,
    entityDirection: Direction | undefined,
  ): boolean {
    const centered = entity.moved.x === 0 && entity.moved.y === 0;

    // Without direction context, keep legacy centered-only behavior.
    if (!outwardDirection || !entityDirection) {
      return centered;
    }

    if (entityDirection !== outwardDirection) {
      return false;
    }

    if (centered) {
      return true;
    }

    return this.isMovementAlignedWithDirection(entity.moved, entityDirection);
  }

  private isMovementAlignedWithDirection(moved: { x: number; y: number }, direction: Direction): boolean {
    if (direction === 'up') {
      return moved.y < 0;
    }
    if (direction === 'down') {
      return moved.y > 0;
    }
    if (direction === 'left') {
      return moved.x < 0;
    }
    return moved.x > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isDirection(value: unknown): value is Direction {
    return value === 'up' || value === 'right' || value === 'down' || value === 'left';
  }

  private isFullyBlocking(collisionTile: {
    collides: boolean;
    up: boolean;
    right: boolean;
    down: boolean;
    left: boolean;
  }): boolean {
    return (
      collisionTile.collides &&
      collisionTile.up &&
      collisionTile.right &&
      collisionTile.down &&
      collisionTile.left
    );
  }
}
