import { GhostEntity } from '../domain/entities/GhostEntity';
import { AnimationKey, AnimationPlayback, WorldState } from '../domain/world/WorldState';

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

export class AnimationSystem {
  constructor(
    private readonly world: WorldState,
    private readonly defaultGhostSpeed: number,
    private readonly animations: Record<AnimationKey, AnimationDefinition> = ANIMATIONS,
  ) {}

  start(): void {
    this.world.ghosts.forEach((ghost) => {
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));
    });
  }

  update(deltaMs: number): void {
    this.world.ghosts.forEach((ghost) => {
      this.updateGhostAnimationState(ghost, deltaMs);
    });
  }

  private updateGhostAnimationState(ghost: GhostEntity, deltaMs: number): void {
    if (ghost.state.scared && ghost.state.animation !== 'scared') {
      ghost.state.animation = 'scared';
      ghost.speed = 0.5;
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback('scaredIdle'));
    } else if (!ghost.state.scared && ghost.state.animation === 'scared') {
      ghost.state.animation = 'default';
      ghost.speed = this.defaultGhostSpeed;
      this.world.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));
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

  private createAnimationPlayback(key: AnimationKey): AnimationPlayback {
    const definition = this.animations[key];
    return {
      key,
      frame: definition.start,
      elapsedMs: 0,
      forward: 1,
    };
  }
}
