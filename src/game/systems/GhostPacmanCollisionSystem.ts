import { loseLife } from '../../state/gameState';
import { findFirstCollision } from '../domain/services/GhostPacmanCollisionService';
import { MovementRules } from '../domain/services/MovementRules';
import { WorldState } from '../domain/world/WorldState';

const PACMAN_RESPAWN_DIRECTION = 'right';

export class GhostPacmanCollisionSystem {
  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
  ) {}

  update(): void {
    const collisionActiveGhosts = this.world.ghosts.filter((ghost) => {
      return ghost.active && ghost.state.free && !this.world.ghostsExitingJail.has(ghost);
    });

    const collision = findFirstCollision({
      pacmanCurrent: this.world.pacman.tile,
      pacmanPrevious: this.world.pacmanPreviousTile,
      ghosts: collisionActiveGhosts,
      ghostPreviousTiles: this.world.ghostPreviousTiles,
    });

    if (!collision || collision.outcome !== 'pacman-hit') {
      return;
    }

    this.applyPacmanHitOutcome();
  }

  private applyPacmanHitOutcome(): void {
    loseLife();
    this.movementRules.setEntityTile(this.world.pacman, this.world.pacmanSpawnTile);
    this.world.pacmanPreviousTile = { ...this.world.pacman.tile };
    this.world.pacman.direction.current = PACMAN_RESPAWN_DIRECTION;
    this.world.pacman.direction.next = PACMAN_RESPAWN_DIRECTION;
    this.world.pacman.portalBlinkRemainingMs = 0;
    this.world.pacman.portalBlinkElapsedMs = 0;
  }
}
