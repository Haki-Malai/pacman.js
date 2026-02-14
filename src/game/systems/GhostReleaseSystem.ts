import {
  GHOST_JAIL_MOVE_SPEED,
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_TWEEN_MS,
} from '../../config/constants';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { GhostJailService } from '../domain/services/GhostJailService';
import { MovementRules, toWorldPosition } from '../domain/services/MovementRules';
import { RandomSource } from '../shared/random/RandomSource';
import { WorldState } from '../domain/world/WorldState';
import { TimerSchedulerAdapter } from '../infrastructure/adapters/TimerSchedulerAdapter';
import { TimerHandle } from '../../engine/timer';

export class GhostReleaseSystem {
  private ghostReleaseTimers: TimerHandle[] = [];

  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly jailService: GhostJailService,
    private readonly scheduler: TimerSchedulerAdapter,
    private readonly rng: RandomSource,
  ) {}

  start(): void {
    this.ghostReleaseTimers = this.world.ghosts.map((ghost) =>
      this.scheduler.delayedCall(GHOST_JAIL_RELEASE_DELAY_MS, () => {
        this.releaseGhost(ghost);
      }),
    );
  }

  update(): void {
    this.world.ghosts.forEach((ghost) => {
      if (!ghost.state.free && !this.world.ghostsExitingJail.has(ghost)) {
        this.jailService.moveGhostInJail(
          ghost,
          this.world.ghostJailBounds,
          this.movementRules,
          this.rng,
          GHOST_JAIL_MOVE_SPEED,
        );
      }
    });
  }

  destroy(): void {
    this.ghostReleaseTimers.forEach((timer) => {
      timer.cancel();
    });
    this.ghostReleaseTimers = [];
  }

  private releaseGhost(ghost: GhostEntity): void {
    if (!ghost.active) {
      return;
    }

    const jailTile = {
      x: ghost.tile.x,
      y: this.world.ghostJailBounds.y,
    };

    const releaseTile = this.jailService.findReleaseTile({
      currentTile: jailTile,
      avoidTile: this.world.pacman.tile,
      bounds: this.world.ghostJailBounds,
      map: this.world.map,
      collisionGrid: this.world.collisionGrid,
      movementRules: this.movementRules,
      rng: this.rng,
    });

    const releaseWorld = toWorldPosition(releaseTile, { x: 0, y: 0 }, this.world.tileSize);
    this.world.ghostsExitingJail.add(ghost);

    this.scheduler.addTween({
      target: ghost,
      to: {
        x: releaseWorld.x,
        y: releaseWorld.y,
      },
      durationMs: GHOST_JAIL_RELEASE_TWEEN_MS,
      ease: 'sineInOut',
      onComplete: () => {
        if (!ghost.active) {
          this.world.ghostsExitingJail.delete(ghost);
          return;
        }

        this.world.ghostsExitingJail.delete(ghost);
        this.movementRules.setEntityTile(ghost, releaseTile);
        ghost.state.free = true;
        ghost.state.soonFree = false;
      },
    });
  }
}
