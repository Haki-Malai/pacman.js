import {
  GHOST_EAT_CHAIN_SCORES,
  PACMAN_DEATH_RECOVERY,
  SPEED,
} from '../../config/constants';
import { addScore, loseLife } from '../../state/gameState';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { CollisionMaskFrame, CollisionMaskSample } from '../domain/valueObjects/CollisionMask';
import { GhostCollisionCandidate, findFirstCollision } from '../domain/services/GhostPacmanCollisionService';
import { clearGhostScaredWindow } from '../domain/services/GhostScaredStateService';
import { MovementRules } from '../domain/services/MovementRules';
import { WorldState } from '../domain/world/WorldState';
import { GhostSpriteSheetKey, resolveGhostSpriteSheetKey } from './resolveGhostSpriteSheetKey';

const PACMAN_RESPAWN_DIRECTION = 'right';
const COLLISION_ALPHA_THRESHOLD = 1;

export interface SpriteMaskProvider {
  getPacmanMask(frame: number, width: number, height: number, alphaThreshold: number): CollisionMaskFrame;
  getGhostMask(
    key: GhostSpriteSheetKey,
    frame: number,
    width: number,
    height: number,
    alphaThreshold: number,
  ): CollisionMaskFrame;
}

class SolidMaskProvider implements SpriteMaskProvider {
  private readonly cache = new Map<string, CollisionMaskFrame>();

  getPacmanMask(frame: number, width: number, height: number, _alphaThreshold: number): CollisionMaskFrame {
    return this.getSolidMask(`pacman:${frame}:${width}:${height}`, width, height);
  }

  getGhostMask(
    key: GhostSpriteSheetKey,
    frame: number,
    width: number,
    height: number,
    _alphaThreshold: number,
  ): CollisionMaskFrame {
    return this.getSolidMask(`ghost:${key}:${frame}:${width}:${height}`, width, height);
  }

  private getSolidMask(cacheKey: string, width: number, height: number): CollisionMaskFrame {
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    const opaque = new Uint8Array(safeWidth * safeHeight);
    opaque.fill(1);

    const mask: CollisionMaskFrame = {
      width: safeWidth,
      height: safeHeight,
      opaque,
    };
    this.cache.set(cacheKey, mask);
    return mask;
  }
}

export class GhostPacmanCollisionSystem {
  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly defaultGhostSpeed: number = SPEED.ghost,
    private readonly maskProvider: SpriteMaskProvider = new SolidMaskProvider(),
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
      pacman: this.buildPacmanSample(),
      ghosts: this.buildGhostCandidates(collisionActiveGhosts),
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

  private buildPacmanSample(): CollisionMaskSample {
    const pacmanFrame = this.world.pacmanAnimation.frame;
    const mask = this.maskProvider.getPacmanMask(
      pacmanFrame,
      this.world.pacman.displayWidth,
      this.world.pacman.displayHeight,
      COLLISION_ALPHA_THRESHOLD,
    );

    return this.toCollisionMaskSample(this.world.pacman, mask);
  }

  private buildGhostCandidates(ghosts: GhostEntity[]): GhostCollisionCandidate[] {
    return ghosts.map((ghost) => {
      const ghostFrame = this.world.ghostAnimations.get(ghost)?.frame ?? 0;
      const spriteKey = resolveGhostSpriteSheetKey(this.world, ghost);
      const mask = this.maskProvider.getGhostMask(
        spriteKey,
        ghostFrame,
        ghost.displayWidth,
        ghost.displayHeight,
        COLLISION_ALPHA_THRESHOLD,
      );

      return {
        ghost,
        sample: this.toCollisionMaskSample(ghost, mask),
      };
    });
  }

  private toCollisionMaskSample(
    entity: Pick<GhostEntity, 'x' | 'y' | 'displayWidth' | 'displayHeight' | 'angle' | 'flipX' | 'flipY'>,
    mask: CollisionMaskFrame,
  ): CollisionMaskSample {
    return {
      x: entity.x,
      y: entity.y,
      width: entity.displayWidth,
      height: entity.displayHeight,
      angle: entity.angle,
      flipX: entity.flipX,
      flipY: entity.flipY,
      mask,
    };
  }
}
