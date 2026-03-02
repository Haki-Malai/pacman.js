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

interface ResolvedPortalContext {
  portalLink: PortalLink;
  direction: Direction;
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

  canAdvanceOutward(entity: PortalTrackedEntity, collisionGrid: CollisionGrid): boolean {
    if (entity.moved.x !== 0 || entity.moved.y !== 0) {
      return false;
    }

    const context = this.resolvePortalContext(entity);
    if (!context) {
      return false;
    }

    return !this.isDestinationFullyBlocking(context.portalLink, collisionGrid);
  }

  tryTeleport(entity: PortalTrackedEntity, collisionGrid: CollisionGrid, tick: number, tileSize = 16): boolean {
    if (this.lastTeleportTick.get(entity) === tick) {
      return false;
    }

    const context = this.resolvePortalContext(entity);
    if (!context) {
      return false;
    }

    if (!this.hasReachedOutwardTeleportThreshold(entity.moved, context.direction, tileSize)) {
      return false;
    }

    if (this.isDestinationFullyBlocking(context.portalLink, collisionGrid)) {
      return false;
    }

    const destination = context.portalLink.destination;
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

  private resolvePortalContext(entity: PortalTrackedEntity): ResolvedPortalContext | null {
    const sourceKey = tileKey(entity.tile);
    const portalLink = this.portalPairs.get(sourceKey);
    if (!portalLink || !portalLink.outwardDirection) {
      return null;
    }

    const direction = this.resolveEntityDirection(entity);
    if (!direction || direction !== portalLink.outwardDirection) {
      return null;
    }

    return { portalLink, direction };
  }

  private hasReachedOutwardTeleportThreshold(
    moved: { x: number; y: number },
    direction: Direction,
    tileSize: number,
  ): boolean {
    const safeTileSize = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 16;
    const threshold = safeTileSize / 2;
    return this.resolveOutwardOffset(moved, direction) >= threshold;
  }

  private resolveOutwardOffset(moved: { x: number; y: number }, direction: Direction): number {
    if (direction === 'up') {
      return -moved.y;
    }
    if (direction === 'down') {
      return moved.y;
    }
    if (direction === 'left') {
      return -moved.x;
    }
    return moved.x;
  }

  private isDestinationFullyBlocking(portalLink: PortalLink, collisionGrid: CollisionGrid): boolean {
    const destination = portalLink.destination;
    const targetCollision = collisionGrid.getTileAt(destination.x, destination.y);
    return this.isFullyBlocking(targetCollision);
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
