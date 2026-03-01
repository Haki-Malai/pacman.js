import {
  GHOST_EAT_CHAIN_SCORES,
  GHOST_EAT_JAIL_FREE_DELAY_MS,
  PACMAN_DEATH_RECOVERY,
  SPEED,
} from '../../config/constants';
import { TimerHandle } from '../../engine/timer';
import { addScore, loseLife } from '../../state/gameState';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { findFirstCollision } from '../domain/services/GhostPacmanCollisionService';
import { MovementRules } from '../domain/services/MovementRules';
import { WorldState } from '../domain/world/WorldState';
import { TimerSchedulerAdapter } from '../infrastructure/adapters/TimerSchedulerAdapter';

const PACMAN_RESPAWN_DIRECTION = 'right';

export class GhostPacmanCollisionSystem {
  private readonly ghostReturnDelayHandles = new Map<GhostEntity, TimerHandle>();

  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly scheduler: TimerSchedulerAdapter,
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

    if (collision.outcome === 'pacman-hit') {
      this.applyPacmanHitOutcome();
      return;
    }

    this.applyGhostHitOutcome(collision.ghost);
    this.resetGhostEatChainIfNoScaredGhosts();
  }

  destroy(): void {
    this.ghostReturnDelayHandles.forEach((handle) => {
      handle.cancel();
    });
    this.ghostReturnDelayHandles.clear();
  }

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
    this.world.ghostScaredRecovery.delete(ghost);
    this.movementRules.setEntityTile(ghost, this.world.ghostJailReturnTile);
    ghost.state.free = false;
    ghost.state.soonFree = false;
    ghost.state.scared = false;
    ghost.state.dead = false;
    ghost.state.animation = 'default';
    ghost.speed = this.defaultGhostSpeed;

    const existingHandle = this.ghostReturnDelayHandles.get(ghost);
    if (existingHandle) {
      existingHandle.cancel();
      this.ghostReturnDelayHandles.delete(ghost);
    }

    const delayedHandle = this.scheduler.delayedCall(GHOST_EAT_JAIL_FREE_DELAY_MS, () => {
      this.ghostReturnDelayHandles.delete(ghost);
      if (!ghost.active) {
        return;
      }

      ghost.state.free = true;
      ghost.state.soonFree = false;
    });
    this.ghostReturnDelayHandles.set(ghost, delayedHandle);
  }

  private isPacmanInDeathRecovery(): boolean {
    return (this.world.pacman.deathRecoveryRemainingMs ?? 0) > 0;
  }

  private resetGhostEatChainIfNoScaredGhosts(): void {
    const hasScaredGhost = this.world.ghosts.some((ghost) => ghost.state.scared);
    if (!hasScaredGhost) {
      this.world.ghostEatChainCount = 0;
    }
  }
}
