import { GhostEntity } from '../entities/GhostEntity';
import { TilePosition } from '../valueObjects/TilePosition';

export type GhostPacmanContactType = 'same-tile' | 'tile-crossing';
export type GhostPacmanCollisionOutcome = 'pacman-hit' | 'ghost-hit';

export interface GhostPacmanCollisionSnapshot {
  pacmanCurrent: TilePosition;
  pacmanPrevious: TilePosition;
  ghostCurrent: TilePosition;
  ghostPrevious: TilePosition;
}

export interface GhostPacmanCollision {
  ghost: GhostEntity;
  contact: GhostPacmanContactType;
  outcome: GhostPacmanCollisionOutcome;
}

export type CollisionOutcomeResolver = (_ghost: GhostEntity) => GhostPacmanCollisionOutcome;

function tilesMatch(a: TilePosition, b: TilePosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isSameTileContact(snapshot: GhostPacmanCollisionSnapshot): boolean {
  return tilesMatch(snapshot.pacmanCurrent, snapshot.ghostCurrent);
}

export function isTileCrossingContact(snapshot: GhostPacmanCollisionSnapshot): boolean {
  return tilesMatch(snapshot.pacmanPrevious, snapshot.ghostCurrent) && tilesMatch(snapshot.ghostPrevious, snapshot.pacmanCurrent);
}

function defaultOutcomeResolver(): GhostPacmanCollisionOutcome {
  return 'pacman-hit';
}

export function findFirstCollision(params: {
  pacmanCurrent: TilePosition;
  pacmanPrevious: TilePosition;
  ghosts: GhostEntity[];
  ghostPreviousTiles: ReadonlyMap<GhostEntity, TilePosition>;
  resolveOutcome?: CollisionOutcomeResolver;
}): GhostPacmanCollision | null {
  const resolveOutcome = params.resolveOutcome ?? defaultOutcomeResolver;

  for (const ghost of params.ghosts) {
    const ghostPrevious = params.ghostPreviousTiles.get(ghost) ?? ghost.tile;
    const snapshot: GhostPacmanCollisionSnapshot = {
      pacmanCurrent: params.pacmanCurrent,
      pacmanPrevious: params.pacmanPrevious,
      ghostCurrent: ghost.tile,
      ghostPrevious,
    };

    if (isSameTileContact(snapshot)) {
      return {
        ghost,
        contact: 'same-tile',
        outcome: resolveOutcome(ghost),
      };
    }

    if (isTileCrossingContact(snapshot)) {
      return {
        ghost,
        contact: 'tile-crossing',
        outcome: resolveOutcome(ghost),
      };
    }
  }

  return null;
}
