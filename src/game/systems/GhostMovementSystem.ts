import { GhostDecisionService } from '../domain/services/GhostDecisionService';
import { MovementRules } from '../domain/services/MovementRules';
import { PortalService } from '../domain/services/PortalService';
import { RandomSource } from '../shared/random/RandomSource';
import { WorldState } from '../domain/world/WorldState';

export class GhostMovementSystem {
  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly decisions: GhostDecisionService,
    private readonly portalService: PortalService,
    private readonly rng: RandomSource,
  ) {}

  update(): void {
    this.world.ghosts.forEach((ghost) => {
      if (!ghost.state.free || this.world.ghostsExitingJail.has(ghost)) {
        return;
      }

      const collisionTiles = this.world.collisionGrid.getTilesAt(ghost.tile);
      const canMoveCurrent = this.movementRules.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles, 'ghost');
      const canAdvanceOutward = this.portalService.canAdvanceOutward(ghost, this.world.collisionGrid);

      if (canMoveCurrent || canAdvanceOutward) {
        if (ghost.moved.x === 0 && ghost.moved.y === 0) {
          if (canMoveCurrent) {
            ghost.direction = this.decisions.chooseDirectionAtCenter(
              ghost.direction,
              collisionTiles,
              this.world.tileSize,
              this.rng,
            );
          }
        }
        this.movementRules.advanceEntity(ghost, ghost.direction, ghost.speed);
      } else if (ghost.moved.x === 0 && ghost.moved.y === 0) {
        ghost.direction = this.decisions.chooseDirectionWhenBlocked(
          ghost.direction,
          ghost.moved.y,
          ghost.moved.x,
          collisionTiles,
          this.world.tileSize,
          this.rng,
        );
      }

      this.portalService.tryTeleport(ghost, this.world.collisionGrid, this.world.tick, this.world.tileSize);
      this.movementRules.syncEntityPosition(ghost);
    });
  }
}
