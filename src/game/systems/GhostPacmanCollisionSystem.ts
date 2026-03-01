import {
  GHOST_EAT_CHAIN_SCORES,
  PACMAN_DEATH_RECOVERY,
  SPEED,
} from '../../config/constants';
import { addScore, loseLife } from '../../state/gameState';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { findFirstCollision } from '../domain/services/GhostPacmanCollisionService';
import { clearGhostScaredWindow } from '../domain/services/GhostScaredStateService';
import { MovementRules } from '../domain/services/MovementRules';
import { WorldState } from '../domain/world/WorldState';

const PACMAN_RESPAWN_DIRECTION = 'right';

export class GhostPacmanCollisionSystem {
  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly defaultGhostSpeed: number = SPEED.ghost,
  ) {}

  update(): void {
    this.resetGhostEatChainIfNoScaredGhosts();
    if (this.isPacmanInDeathRecovery()) {
      return;
    }

    const collisionActiveGhosts = this.world.ghosts.filter((ghost) => {
      return ghost.active && ghost.state.free && !this.world.ghostsExitingJail.has(ghost);
    });

    const collision = findFirstCollision({
      pacmanCurrent: this.world.pacman.tile,
      pacmanPrevious: this.world.pacmanPreviousTile,
      ghosts: collisionActiveGhosts,
      ghostPreviousTiles: this.world.ghostPreviousTiles,
    });

    if (!collision) {
      return;
    }

    if (collision.outcome === 'pacman-hit' && this.isPacmanInPortalShieldWindow()) {
      return;
    }

    if (collision.outcome === 'pacman-hit') {
      this.applyPacmanHitOutcome();
      return;
    }

    this.applyGhostHitOutcome(collision.ghost);
    this.resetGhostEatChainIfNoScaredGhosts();
  }

  destroy(): void {}

  private applyPacmanHitOutcome(): void {
    loseLife();
    this.movementRules.setEntityTile(this.world.pacman, this.world.pacmanSpawnTile);
    this.world.pacmanPreviousTile = { ...this.world.pacman.tile };
    this.world.pacman.direction.current = PACMAN_RESPAWN_DIRECTION;
    this.world.pacman.direction.next = PACMAN_RESPAWN_DIRECTION;
    this.world.pacman.portalBlinkRemainingMs = 0;
    this.world.pacman.portalBlinkElapsedMs = 0;
    this.world.pacman.deathRecoveryRemainingMs = PACMAN_DEATH_RECOVERY.durationMs;
    this.world.pacman.deathRecoveryElapsedMs = 0;
    this.world.pacman.deathRecoveryNextToggleAtMs = PACMAN_DEATH_RECOVERY.blinkStartIntervalMs;
    this.world.pacman.deathRecoveryVisible = true;
  }

  private applyGhostHitOutcome(ghost: GhostEntity): void {
    const chainScoreIndex = Math.min(this.world.ghostEatChainCount, GHOST_EAT_CHAIN_SCORES.length - 1);
    addScore(GHOST_EAT_CHAIN_SCORES[chainScoreIndex] ?? GHOST_EAT_CHAIN_SCORES[GHOST_EAT_CHAIN_SCORES.length - 1]);
    this.world.ghostEatChainCount += 1;

    this.world.ghostsExitingJail.delete(ghost);
    clearGhostScaredWindow(this.world, ghost);
    this.movementRules.setEntityTile(ghost, this.world.ghostJailReturnTile);
    ghost.state.free = false;
    ghost.state.soonFree = true;
    ghost.state.dead = false;
    ghost.state.animation = 'default';
    ghost.speed = this.defaultGhostSpeed;
  }

  private isPacmanInDeathRecovery(): boolean {
    return (this.world.pacman.deathRecoveryRemainingMs ?? 0) > 0;
  }

  private isPacmanInPortalShieldWindow(): boolean {
    return (this.world.pacman.portalBlinkRemainingMs ?? 0) > 0;
  }

  private resetGhostEatChainIfNoScaredGhosts(): void {
    const hasScaredGhost = this.world.ghosts.some((ghost) => ghost.state.scared);
    if (!hasScaredGhost) {
      this.world.ghostEatChainCount = 0;
    }
  }
}
