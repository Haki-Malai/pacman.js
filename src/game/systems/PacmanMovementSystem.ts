import { SPEED } from '../../config/constants';
import { PortalService } from '../domain/services/PortalService';
import { MovementRules } from '../domain/services/MovementRules';
import { WorldState } from '../domain/world/WorldState';

export class PacmanMovementSystem {
  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly portalService: PortalService,
  ) {}

  update(): void {
    this.updateDirectionVisuals();

    const collisionTiles = this.world.collisionGrid.getTilesAt(this.world.pacman.tile);
    this.movementRules.applyBufferedDirection(this.world.pacman, collisionTiles);

    if (
      this.movementRules.canMove(
        this.world.pacman.direction.current,
        this.world.pacman.moved.y,
        this.world.pacman.moved.x,
        collisionTiles,
      )
    ) {
      this.movementRules.advanceEntity(this.world.pacman, this.world.pacman.direction.current, SPEED.pacman);
    }

    this.portalService.tryTeleport(this.world.pacman, this.world.collisionGrid, this.world.tick);
    this.movementRules.syncEntityPosition(this.world.pacman);
  }

  private updateDirectionVisuals(): void {
    if (this.world.pacman.direction.current === 'right') {
      this.world.pacman.angle = 0;
      this.world.pacman.flipY = false;
      return;
    }

    if (this.world.pacman.direction.current === 'left') {
      this.world.pacman.angle = 180;
      this.world.pacman.flipY = true;
      return;
    }

    if (this.world.pacman.direction.current === 'up') {
      this.world.pacman.angle = -90;
      return;
    }

    if (this.world.pacman.direction.current === 'down') {
      this.world.pacman.angle = 90;
    }
  }
}
