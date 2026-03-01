import { GHOST_SCARED_WARNING_DURATION_MS, PACMAN_DEATH_RECOVERY } from '../../config/constants';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { clearGhostScaredWindow } from '../domain/services/GhostScaredStateService';
import {
  AnimationKey,
  AnimationPlayback,
  PacmanAnimationPlayback,
  WorldState,
} from '../domain/world/WorldState';

interface AnimationDefinition {
  start: number;
  end: number;
  yoyo: boolean;
  frameRate: number;
}

const ANIMATIONS: Record<AnimationKey, AnimationDefinition> = {
  scaredIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  inkyIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  clydeIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  pinkyIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  blinkyIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
};

const PACMAN_CHOMP_SEQUENCE = [0, 1, 2, 3, 2, 1] as const;
const PACMAN_IDLE_FRAME = PACMAN_CHOMP_SEQUENCE[0];
const PACMAN_CHOMP_FRAME_RATE = 20;
const SCARED_GHOST_SPEED = 0.5;

export class AnimationSystem {
  constructor(
    private readonly world: WorldState,
    private readonly defaultGhostSpeed: number,
    private readonly animations: Record<AnimationKey, AnimationDefinition> = ANIMATIONS,
  ) {}

  start(): void {
    this.world.pacmanAnimation = this.createPacmanAnimationPlayback();

    this.world.ghosts.forEach((ghost) => {
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));
    });
  }

  update(deltaMs: number): void {
    this.updatePacmanAnimationState(deltaMs);

    this.world.ghosts.forEach((ghost) => {
      this.updateGhostAnimationState(ghost, deltaMs);
    });
  }

  private updatePacmanAnimationState(deltaMs: number): void {
    const playback = this.world.pacmanAnimation;

    if (!playback.active) {
      playback.frame = PACMAN_IDLE_FRAME;
      playback.elapsedMs = 0;
      playback.sequenceIndex = 0;
      return;
    }

    const frameDurationMs = 1000 / PACMAN_CHOMP_FRAME_RATE;
    playback.elapsedMs += deltaMs;

    while (playback.elapsedMs >= frameDurationMs) {
      playback.elapsedMs -= frameDurationMs;
      playback.sequenceIndex += 1;

      if (playback.sequenceIndex >= PACMAN_CHOMP_SEQUENCE.length) {
        playback.active = false;
        playback.frame = PACMAN_IDLE_FRAME;
        playback.elapsedMs = 0;
        playback.sequenceIndex = 0;
        return;
      }

      playback.frame = PACMAN_CHOMP_SEQUENCE[playback.sequenceIndex];
    }
  }

  private updateGhostAnimationState(ghost: GhostEntity, deltaMs: number): void {
    this.updateGhostScaredTimer(ghost, deltaMs);

    if (ghost.state.scared && ghost.state.animation !== 'scared') {
      ghost.state.animation = 'scared';
      ghost.speed = SCARED_GHOST_SPEED;
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback('scaredIdle'));
    } else if (!ghost.state.scared && ghost.state.animation === 'scared') {
      ghost.state.animation = 'default';
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));

      if (this.canRestoreGhostSpeed(ghost)) {
        ghost.speed = this.defaultGhostSpeed;
      }
    }

    if (!ghost.state.scared && ghost.speed !== this.defaultGhostSpeed && this.canRestoreGhostSpeed(ghost)) {
      ghost.speed = this.defaultGhostSpeed;
    }

    const playback = this.world.ghostAnimations.get(ghost);
    if (!playback) {
      return;
    }

    const definition = this.animations[playback.key];
    const frameDuration = 1000 / definition.frameRate;
    playback.elapsedMs += deltaMs;

    while (playback.elapsedMs >= frameDuration) {
      playback.elapsedMs -= frameDuration;

      if (!definition.yoyo) {
        playback.frame = playback.frame + 1 > definition.end ? definition.start : playback.frame + 1;
        continue;
      }

      if (playback.forward === 1) {
        if (playback.frame < definition.end) {
          playback.frame += 1;
        } else {
          playback.forward = -1;
          playback.frame -= 1;
        }
      } else if (playback.frame > definition.start) {
        playback.frame -= 1;
      } else {
        playback.forward = 1;
        playback.frame += 1;
      }
    }
  }

  private updateGhostScaredTimer(ghost: GhostEntity, deltaMs: number): void {
    const remainingBefore = this.world.ghostScaredTimers.get(ghost) ?? 0;
    if (remainingBefore <= 0) {
      this.world.ghostScaredWarnings.delete(ghost);
      return;
    }

    if (!ghost.state.scared) {
      ghost.state.scared = true;
    }

    const safeDelta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    const remainingAfter = Math.max(0, remainingBefore - safeDelta);

    if (remainingAfter <= 0) {
      clearGhostScaredWindow(this.world, ghost);
      return;
    }

    this.world.ghostScaredTimers.set(ghost, remainingAfter);
    this.updateGhostWarningState(ghost, remainingBefore, remainingAfter);
  }

  private updateGhostWarningState(ghost: GhostEntity, remainingBefore: number, remainingAfter: number): void {
    if (remainingAfter > GHOST_SCARED_WARNING_DURATION_MS) {
      this.world.ghostScaredWarnings.delete(ghost);
      return;
    }

    const warningElapsedBeforeTick = Math.max(0, GHOST_SCARED_WARNING_DURATION_MS - remainingBefore);
    const warningElapsedAfterTick = Math.max(0, GHOST_SCARED_WARNING_DURATION_MS - remainingAfter);
    const warningDelta = Math.max(0, warningElapsedAfterTick - warningElapsedBeforeTick);

    let warning = this.world.ghostScaredWarnings.get(ghost);
    if (!warning) {
      warning = {
        elapsedMs: warningElapsedBeforeTick,
        nextToggleAtMs: this.resolveNextGhostWarningToggleAt(warningElapsedBeforeTick),
        showBaseColor: false,
      };
    }

    const elapsedBefore = warning.elapsedMs;
    warning.elapsedMs = Math.min(GHOST_SCARED_WARNING_DURATION_MS, warning.elapsedMs + warningDelta);

    let nextToggleAtMs = warning.nextToggleAtMs;
    if (!Number.isFinite(nextToggleAtMs) || nextToggleAtMs <= 0) {
      nextToggleAtMs = this.resolveNextGhostWarningToggleAt(elapsedBefore);
    }

    while (nextToggleAtMs > 0 && warning.elapsedMs >= nextToggleAtMs) {
      warning.showBaseColor = !warning.showBaseColor;
      nextToggleAtMs = this.resolveNextGhostWarningToggleAt(nextToggleAtMs);
    }

    warning.nextToggleAtMs = nextToggleAtMs;
    this.world.ghostScaredWarnings.set(ghost, warning);
  }

  private resolveNextGhostWarningToggleAt(fromElapsedMs: number): number {
    if (fromElapsedMs >= GHOST_SCARED_WARNING_DURATION_MS) {
      return 0;
    }

    const intervalMs = this.resolveGhostWarningBlinkInterval(fromElapsedMs);
    const nextToggleAtMs = fromElapsedMs + intervalMs;
    return nextToggleAtMs >= GHOST_SCARED_WARNING_DURATION_MS ? GHOST_SCARED_WARNING_DURATION_MS : nextToggleAtMs;
  }

  private resolveGhostWarningBlinkInterval(elapsedMs: number): number {
    if (GHOST_SCARED_WARNING_DURATION_MS <= 0) {
      return PACMAN_DEATH_RECOVERY.blinkStartIntervalMs;
    }

    const progress = Math.max(0, Math.min(1, elapsedMs / GHOST_SCARED_WARNING_DURATION_MS));
    const interval =
      PACMAN_DEATH_RECOVERY.blinkStartIntervalMs +
      (PACMAN_DEATH_RECOVERY.blinkEndIntervalMs - PACMAN_DEATH_RECOVERY.blinkStartIntervalMs) * progress;

    return Math.max(1, Math.round(interval));
  }

  private createAnimationPlayback(key: AnimationKey): AnimationPlayback {
    const definition = this.animations[key];
    return {
      key,
      frame: definition.start,
      elapsedMs: 0,
      forward: 1,
    };
  }

  private createPacmanAnimationPlayback(): PacmanAnimationPlayback {
    return {
      frame: PACMAN_IDLE_FRAME,
      elapsedMs: 0,
      sequenceIndex: 0,
      active: false,
    };
  }

  private canRestoreGhostSpeed(ghost: GhostEntity): boolean {
    if (!ghost.state.free) {
      return true;
    }

    return ghost.moved.x === 0 && ghost.moved.y === 0;
  }
}
