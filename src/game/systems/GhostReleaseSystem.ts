import {
  GHOST_JAIL_MOVE_SPEED,
  GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS,
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_INTERVAL_MS,
  GHOST_JAIL_RELEASE_TWEEN_MS,
} from '../../config/constants';
import { TimerHandle } from '../../engine/timer';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { GhostJailService } from '../domain/services/GhostJailService';
import { MovementRules, toWorldPosition } from '../domain/services/MovementRules';
import { RandomSource } from '../shared/random/RandomSource';
import { WorldState } from '../domain/world/WorldState';
import { TimerSchedulerAdapter } from '../infrastructure/adapters/TimerSchedulerAdapter';

const POSITION_EPSILON = 0.001;
const FIXED_STEP_MS = 1000 / 60;
const MIN_RELEASE_TRANSITION_MS = 120;

type ReleaseDirection = 'left' | 'right';

export class GhostReleaseSystem {
  private ghostReleaseTimers = new Map<GhostEntity, TimerHandle>();

  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly jailService: GhostJailService,
    private readonly scheduler: TimerSchedulerAdapter,
    private readonly rng: RandomSource,
  ) {}

  start(): void {
    this.clearReleaseTimers();
    this.world.ghosts.forEach((ghost, ghostIndex) => {
      const delay = GHOST_JAIL_RELEASE_DELAY_MS + ghostIndex * GHOST_JAIL_RELEASE_INTERVAL_MS;
      this.queueGhostRelease(ghost, delay);
    });
  }

  update(): void {
    this.world.ghosts.forEach((ghost) => {
      if (this.shouldQueueRelease(ghost)) {
        this.queueGhostRelease(ghost);
      }

      if (!ghost.state.free && !this.world.ghostsExitingJail.has(ghost)) {
        this.jailService.moveGhostInJail(
          ghost,
          this.world.ghostJailBounds,
          this.movementRules,
          this.rng,
          GHOST_JAIL_MOVE_SPEED,
        );
        this.movementRules.syncEntityPosition(ghost);
      }
    });
  }

  destroy(): void {
    this.clearReleaseTimers();
  }

  queueGhostRelease(ghost: GhostEntity, delayMs: number = GHOST_JAIL_RELEASE_DELAY_MS): void {
    if (!ghost.active || ghost.state.free) {
      return;
    }

    ghost.state.soonFree = true;

    const existingTimer = this.ghostReleaseTimers.get(ghost);
    if (existingTimer) {
      existingTimer.cancel();
      this.ghostReleaseTimers.delete(ghost);
    }

    const ghostIndex = Math.max(0, this.world.ghosts.indexOf(ghost));
    const queuedOffsetMs =
      delayMs === GHOST_JAIL_RELEASE_DELAY_MS ? this.resolveQueuedReleaseOffsetMs(ghost) : 0;
    const handle = this.scheduler.delayedCall(delayMs + queuedOffsetMs, () => {
      this.ghostReleaseTimers.delete(ghost);
      this.releaseGhost(ghost, ghostIndex);
    });
    this.ghostReleaseTimers.set(ghost, handle);
  }

  private releaseGhost(ghost: GhostEntity, ghostIndex: number): void {
    if (!ghost.active || ghost.state.free || !ghost.state.soonFree) {
      return;
    }

    const releaseLaneTile = {
      x: this.resolveReleaseLaneX(ghost, ghostIndex),
      y: this.world.ghostJailBounds.y,
    };
    const releaseDirection = this.resolveReleaseDirection(releaseLaneTile.x);

    const releaseTile = this.jailService.findReleaseTile({
      currentTile: releaseLaneTile,
      avoidTile: this.world.pacman.tile,
      bounds: this.world.ghostJailBounds,
      map: this.world.map,
      collisionGrid: this.world.collisionGrid,
      movementRules: this.movementRules,
      rng: this.rng,
      preferDirection: releaseDirection,
    });

    this.world.ghostsExitingJail.add(ghost);

    const releaseLaneWorld = toWorldPosition(releaseLaneTile, { x: 0, y: 0 }, this.world.tileSize);

    const startExitTween = () => {
      this.startExitTween(ghost, releaseTile);
    };

    if (!this.needsAlignment(ghost, releaseLaneWorld)) {
      startExitTween();
      return;
    }

    const alignDurationMs = this.resolveTransitionDurationMs(
      ghost,
      { x: ghost.x, y: ghost.y },
      releaseLaneWorld,
      GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS,
    );

    this.scheduler.addTween({
      target: ghost,
      to: {
        x: releaseLaneWorld.x,
        y: releaseLaneWorld.y,
      },
      durationMs: alignDurationMs,
      ease: 'sineInOut',
      onComplete: () => {
        if (!ghost.active) {
          this.world.ghostsExitingJail.delete(ghost);
          return;
        }

        startExitTween();
      },
    });
  }

  private startExitTween(ghost: GhostEntity, releaseTile: { x: number; y: number }): void {
    const releaseWorld = toWorldPosition(releaseTile, { x: 0, y: 0 }, this.world.tileSize);
    const exitDurationMs = this.resolveTransitionDurationMs(
      ghost,
      { x: ghost.x, y: ghost.y },
      releaseWorld,
      GHOST_JAIL_RELEASE_TWEEN_MS,
    );

    this.scheduler.addTween({
      target: ghost,
      to: {
        x: releaseWorld.x,
        y: releaseWorld.y,
      },
      durationMs: exitDurationMs,
      ease: 'sineInOut',
      onComplete: () => {
        if (!ghost.active) {
          this.world.ghostsExitingJail.delete(ghost);
          return;
        }

        this.world.ghostsExitingJail.delete(ghost);
        this.movementRules.setEntityTile(ghost, releaseTile);
        ghost.direction = 'up';
        ghost.state.free = true;
        ghost.state.soonFree = false;
      },
    });
  }

  private needsAlignment(ghost: GhostEntity, target: { x: number; y: number }): boolean {
    return Math.abs(ghost.x - target.x) > POSITION_EPSILON || Math.abs(ghost.y - target.y) > POSITION_EPSILON;
  }

  private resolveTransitionDurationMs(
    ghost: GhostEntity,
    from: { x: number; y: number },
    to: { x: number; y: number },
    maxDurationMs: number,
  ): number {
    const distancePx = Math.hypot(to.x - from.x, to.y - from.y);
    if (distancePx <= POSITION_EPSILON) {
      return 1;
    }

    const speedPxPerStep = Math.max(ghost.speed, POSITION_EPSILON);
    const speedAlignedMs = (distancePx / speedPxPerStep) * FIXED_STEP_MS;
    const boundedMs = Math.min(maxDurationMs, speedAlignedMs);

    return Math.max(MIN_RELEASE_TRANSITION_MS, Math.round(boundedMs));
  }

  private clearReleaseTimers(): void {
    this.ghostReleaseTimers.forEach((timer) => {
      timer.cancel();
    });
    this.ghostReleaseTimers.clear();
  }

  private shouldQueueRelease(ghost: GhostEntity): boolean {
    return !ghost.state.free && ghost.state.soonFree && !this.world.ghostsExitingJail.has(ghost) && !this.ghostReleaseTimers.has(ghost);
  }

  private resolveQueuedReleaseOffsetMs(ghost: GhostEntity): number {
    let queuedCount = 0;
    this.ghostReleaseTimers.forEach((_handle, queuedGhost) => {
      if (queuedGhost !== ghost) {
        queuedCount += 1;
      }
    });
    return queuedCount * GHOST_JAIL_RELEASE_INTERVAL_MS;
  }

  private resolveReleaseLaneX(ghost: GhostEntity, ghostIndex: number): number {
    const minX = this.world.ghostJailBounds.minX;
    const maxX = this.world.ghostJailBounds.maxX;
    const ghostLaneX = Math.round(ghost.tile.x);

    if (Number.isFinite(ghostLaneX) && ghostLaneX >= minX && ghostLaneX <= maxX) {
      return ghostLaneX;
    }

    const laneCount = Math.max(1, maxX - minX + 1);
    const laneOffset = ((ghostIndex % laneCount) + laneCount) % laneCount;
    return minX + laneOffset;
  }

  private resolveReleaseDirection(tileX: number): ReleaseDirection {
    const centerX = (this.world.ghostJailBounds.minX + this.world.ghostJailBounds.maxX) / 2;
    return tileX <= centerX ? 'left' : 'right';
  }
}
