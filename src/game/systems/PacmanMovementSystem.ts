import { PACMAN_PORTAL_BLINK, SPEED } from '../../config/constants';
import { PortalService } from '../domain/services/PortalService';
import { MovementRules } from '../domain/services/MovementRules';
import { WorldState } from '../domain/world/WorldState';

export class PacmanMovementSystem {
  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly portalService: PortalService,
  ) {}

  update(deltaMs = 0): void {
    this.updatePortalBlink(deltaMs);
    this.updateDirectionVisuals();
    this.world.pacmanPreviousTile = { ...this.world.pacman.tile };

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

    const teleported = this.portalService.tryTeleport(this.world.pacman, this.world.collisionGrid, this.world.tick);
    if (teleported) {
      this.world.pacman.portalBlinkRemainingMs = PACMAN_PORTAL_BLINK.durationMs;
      this.world.pacman.portalBlinkElapsedMs = 0;
    }

    this.movementRules.syncEntityPosition(this.world.pacman);
  }

  private updatePortalBlink(deltaMs: number): void {
    const remaining = this.world.pacman.portalBlinkRemainingMs ?? 0;
    if (remaining <= 0) {
      this.world.pacman.portalBlinkRemainingMs = 0;
      this.world.pacman.portalBlinkElapsedMs = 0;
      return;
    }

    const safeDelta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    const nextRemaining = Math.max(0, remaining - safeDelta);
    this.world.pacman.portalBlinkRemainingMs = nextRemaining;

    if (nextRemaining <= 0) {
      this.world.pacman.portalBlinkElapsedMs = 0;
      return;
    }

    const elapsed = this.world.pacman.portalBlinkElapsedMs ?? 0;
    this.world.pacman.portalBlinkElapsedMs = elapsed + safeDelta;
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
