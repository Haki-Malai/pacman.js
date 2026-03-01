import { GHOST_SCARED_RECOVERY_CROSSFADE_MS } from '../../config/constants';
import { GhostEntity } from '../domain/entities/GhostEntity';
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
    if (ghost.state.scared && ghost.state.animation !== 'scared') {
      ghost.state.animation = 'scared';
      ghost.speed = 0.5;
      this.world.ghostScaredRecovery.delete(ghost);
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback('scaredIdle'));
    } else if (!ghost.state.scared && ghost.state.animation === 'scared') {
      ghost.state.animation = 'default';
      ghost.speed = this.defaultGhostSpeed;
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));
      this.world.ghostScaredRecovery.set(ghost, {
        elapsedMs: 0,
        durationMs: GHOST_SCARED_RECOVERY_CROSSFADE_MS,
      });
    }

    this.updateGhostScaredRecovery(ghost, deltaMs);

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

  private updateGhostScaredRecovery(ghost: GhostEntity, deltaMs: number): void {
    const recovery = this.world.ghostScaredRecovery.get(ghost);
    if (!recovery) {
      return;
    }

    const safeDelta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    recovery.elapsedMs = Math.min(recovery.durationMs, recovery.elapsedMs + safeDelta);
    if (recovery.elapsedMs >= recovery.durationMs) {
      this.world.ghostScaredRecovery.delete(ghost);
    }
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
}
