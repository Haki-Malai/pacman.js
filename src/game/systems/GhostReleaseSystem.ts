import {
  GHOST_JAIL_MOVE_SPEED,
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_INTERVAL_MS,
} from '../../config/constants';
import { TimerHandle } from '../../engine/timer';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { GhostJailService } from '../domain/services/GhostJailService';
import { MovementRules } from '../domain/services/MovementRules';
import { Direction, MovementActor } from '../domain/valueObjects/Direction';
import { RandomSource } from '../shared/random/RandomSource';
import { WorldState } from '../domain/world/WorldState';
import { TimerSchedulerAdapter } from '../infrastructure/adapters/TimerSchedulerAdapter';

type ReleaseSide = 'left' | 'right';
type ReleasePhase = 'to_side_center' | 'to_gate_column' | 'cross_gate_once';

interface ReleaseProgress {
  side: ReleaseSide;
  phase: ReleasePhase;
  gateColumnX: number;
  releaseY: number;
}

type MoveOutcome = 'moved' | 'reached' | 'blocked';
const POSITION_EPSILON = 0.001;

export class GhostReleaseSystem {
  private ghostReleaseTimers = new Map<GhostEntity, TimerHandle>();
  private releaseProgressByGhost = new Map<GhostEntity, ReleaseProgress>();
  private nextReleaseSide: ReleaseSide = 'left';

  constructor(
    private readonly world: WorldState,
    private readonly movementRules: MovementRules,
    private readonly jailService: GhostJailService,
    private readonly scheduler: TimerSchedulerAdapter,
    private readonly rng: RandomSource,
  ) {}

  start(): void {
    this.clearReleaseTimers();
    this.releaseProgressByGhost.clear();
    this.world.ghostsExitingJail.clear();
    this.nextReleaseSide = 'left';
    this.world.ghosts.forEach((ghost, ghostIndex) => {
      const delay = GHOST_JAIL_RELEASE_DELAY_MS + ghostIndex * GHOST_JAIL_RELEASE_INTERVAL_MS;
      this.queueGhostRelease(ghost, delay);
    });
  }

  update(): void {
    this.world.ghosts.forEach((ghost) => {
      if (!ghost.active) {
        this.cleanupGhostReleaseState(ghost);
        return;
      }

      if (this.shouldQueueRelease(ghost)) {
        this.queueGhostRelease(ghost);
      }

      if (this.world.ghostsExitingJail.has(ghost)) {
        this.advanceRelease(ghost);
        return;
      }

      if (!ghost.state.free) {
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
    this.releaseProgressByGhost.clear();
    this.world.ghostsExitingJail.clear();
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

  private releaseGhost(ghost: GhostEntity, _ghostIndex: number): void {
    if (!ghost.active || ghost.state.free || !ghost.state.soonFree) {
      return;
    }

    const side = this.nextReleaseSide;
    const releaseY = this.resolveReleaseY();
    const gateColumnX = this.resolveGateColumn(side, releaseY);
    if (gateColumnX === null) {
      this.queueGhostRelease(ghost, GHOST_JAIL_RELEASE_INTERVAL_MS);
      return;
    }

    this.nextReleaseSide = side === 'left' ? 'right' : 'left';

    this.world.ghostsExitingJail.add(ghost);
    this.releaseProgressByGhost.set(ghost, {
      side,
      phase: 'to_side_center',
      gateColumnX,
      releaseY,
    });
  }

  private advanceRelease(ghost: GhostEntity): void {
    const progress = this.releaseProgressByGhost.get(ghost);
    if (!progress) {
      this.cleanupGhostReleaseState(ghost);
      return;
    }

    if (progress.phase === 'to_side_center') {
      const sideCenterX = progress.side === 'left' ? this.world.ghostJailBounds.minX : this.world.ghostJailBounds.maxX;
      const sideTarget = { x: sideCenterX, y: this.world.ghostJailBounds.y };
      const outcome = this.moveGhostTowardTarget(ghost, sideTarget, 'ghostRelease');
      if (outcome === 'blocked') {
        this.abortRelease(ghost);
        return;
      }
      if (outcome === 'reached') {
        progress.phase = 'to_gate_column';
      }
      return;
    }

    if (progress.phase === 'to_gate_column') {
      const gateTarget = { x: progress.gateColumnX, y: this.world.ghostJailBounds.y };
      const outcome = this.moveGhostTowardTarget(ghost, gateTarget, 'ghostRelease');
      if (outcome === 'blocked') {
        const fallbackGate = this.resolveGateColumn(progress.side, progress.releaseY);
        if (fallbackGate === null) {
          this.abortRelease(ghost);
          return;
        }
        progress.gateColumnX = fallbackGate;
        return;
      }
      if (outcome === 'reached') {
        progress.phase = 'cross_gate_once';
      }
      return;
    }

    if (progress.phase === 'cross_gate_once') {
      const releaseTarget = { x: progress.gateColumnX, y: progress.releaseY };
      const outcome = this.moveGhostTowardTarget(ghost, releaseTarget, 'ghostRelease');
      if (outcome === 'blocked') {
        const fallbackGate = this.resolveGateColumn(progress.side, progress.releaseY);
        if (fallbackGate === null || fallbackGate === progress.gateColumnX) {
          this.abortRelease(ghost);
          return;
        }
        progress.gateColumnX = fallbackGate;
        progress.phase = 'to_gate_column';
        return;
      }
      if (outcome === 'reached') {
        this.completeRelease(ghost, progress);
      }
    }
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

  private resolveReleaseY(): number {
    const releaseY = this.world.ghostJailBounds.y - 1;
    if (releaseY < 0) {
      return 0;
    }
    if (releaseY >= this.world.map.height) {
      return this.world.map.height - 1;
    }
    return releaseY;
  }

  private resolveGateColumn(side: ReleaseSide, releaseY: number): number | null {
    const columns = this.resolveGateScanColumns(side);
    for (const columnX of columns) {
      if (this.isGateColumnTraversable(columnX, releaseY)) {
        return columnX;
      }
    }
    const minX = this.world.ghostJailBounds.minX;
    const maxX = this.world.ghostJailBounds.maxX;
    return minX + Math.floor((maxX - minX) / 2);
  }

  private resolveGateScanColumns(side: ReleaseSide): number[] {
    const minX = this.world.ghostJailBounds.minX;
    const maxX = this.world.ghostJailBounds.maxX;
    const columns: number[] = [];

    if (side === 'left') {
      for (let x = minX; x <= maxX; x += 1) {
        columns.push(x);
      }
      return columns;
    }

    for (let x = maxX; x >= minX; x -= 1) {
      columns.push(x);
    }
    return columns;
  }

  private isGateColumnTraversable(columnX: number, releaseY: number): boolean {
    void releaseY;
    const jailTile = { x: columnX, y: this.world.ghostJailBounds.y };
    const jailCollisionTiles = this.world.collisionGrid.getTilesAt(jailTile);
    return this.movementRules.canMove('up', 0, 0, jailCollisionTiles, 'ghostRelease');
  }

  private moveGhostTowardTarget(
    ghost: GhostEntity,
    targetTile: { x: number; y: number },
    actor: MovementActor,
  ): MoveOutcome {
    const snappedBeforeMove = this.snapResidualOffsetsAtTargetAxes(ghost, targetTile);
    if (snappedBeforeMove) {
      this.movementRules.syncEntityPosition(ghost);
    }

    if (this.isAtTargetCenter(ghost, targetTile)) {
      return 'reached';
    }

    const direction = this.resolveDirectionTowardTarget(ghost, targetTile);
    if (!direction) {
      return 'reached';
    }

    const collisionTiles = this.world.collisionGrid.getTilesAt(ghost.tile);
    const canMoveDirection =
      actor === 'ghostRelease'
        ? true
        : this.movementRules.canMove(direction, ghost.moved.y, ghost.moved.x, collisionTiles, actor);
    if (!canMoveDirection) {
      return 'blocked';
    }

    ghost.direction = direction;
    this.movementRules.advanceEntity(ghost, direction, ghost.speed);
    const snappedAfterMove = this.snapResidualOffsetsAtTargetAxes(ghost, targetTile);
    this.movementRules.syncEntityPosition(ghost);

    if (snappedAfterMove) {
      this.movementRules.syncEntityPosition(ghost);
    }

    return this.isAtTargetCenter(ghost, targetTile) ? 'reached' : 'moved';
  }

  private isAtTargetCenter(ghost: GhostEntity, targetTile: { x: number; y: number }): boolean {
    return (
      ghost.tile.x === targetTile.x &&
      ghost.tile.y === targetTile.y &&
      Math.abs(ghost.moved.x) <= POSITION_EPSILON &&
      Math.abs(ghost.moved.y) <= POSITION_EPSILON
    );
  }

  private snapResidualOffsetsAtTargetAxes(ghost: GhostEntity, targetTile: { x: number; y: number }): boolean {
    let changed = false;
    if (ghost.tile.x === targetTile.x && Math.abs(ghost.moved.x) <= ghost.speed) {
      if (Math.abs(ghost.moved.x) > POSITION_EPSILON) {
        ghost.moved.x = 0;
        changed = true;
      }
    }
    if (ghost.tile.y === targetTile.y && Math.abs(ghost.moved.y) <= ghost.speed) {
      if (Math.abs(ghost.moved.y) > POSITION_EPSILON) {
        ghost.moved.y = 0;
        changed = true;
      }
    }
    return changed;
  }

  private resolveDirectionTowardTarget(ghost: GhostEntity, targetTile: { x: number; y: number }): Direction | null {
    const verticalDirection = this.resolveVerticalDirection(ghost, targetTile.y);
    if (verticalDirection) {
      return verticalDirection;
    }
    return this.resolveHorizontalDirection(ghost, targetTile.x);
  }

  private resolveHorizontalDirection(ghost: GhostEntity, targetX: number): Direction | null {
    if (ghost.tile.x < targetX) {
      return 'right';
    }
    if (ghost.tile.x > targetX) {
      return 'left';
    }
    if (ghost.moved.x > 0) {
      return 'left';
    }
    if (ghost.moved.x < 0) {
      return 'right';
    }
    return null;
  }

  private resolveVerticalDirection(ghost: GhostEntity, targetY: number): Direction | null {
    if (ghost.tile.y < targetY) {
      return 'down';
    }
    if (ghost.tile.y > targetY) {
      return 'up';
    }
    if (ghost.moved.y > 0) {
      return 'up';
    }
    if (ghost.moved.y < 0) {
      return 'down';
    }
    return null;
  }

  private completeRelease(ghost: GhostEntity, progress: ReleaseProgress): void {
    this.cleanupGhostReleaseState(ghost);
    this.movementRules.setEntityTile(ghost, { x: progress.gateColumnX, y: progress.releaseY });
    ghost.direction = 'up';
    ghost.state.free = true;
    ghost.state.soonFree = false;
  }

  private abortRelease(ghost: GhostEntity): void {
    this.cleanupGhostReleaseState(ghost);
    if (!ghost.active || ghost.state.free) {
      return;
    }
    this.queueGhostRelease(ghost, GHOST_JAIL_RELEASE_INTERVAL_MS);
  }

  private cleanupGhostReleaseState(ghost: GhostEntity): void {
    const timer = this.ghostReleaseTimers.get(ghost);
    if (timer) {
      timer.cancel();
      this.ghostReleaseTimers.delete(ghost);
    }
    this.releaseProgressByGhost.delete(ghost);
    this.world.ghostsExitingJail.delete(ghost);
  }
}
