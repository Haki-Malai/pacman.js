import { FixedStepLoop } from '../../engine/loop';
import { ComposedGame, PacmanGame, RenderCapableSystem, RuntimeControl, UpdateCapableSystem } from './contracts';
import { GameCompositionRoot } from './GameCompositionRoot';

export class GameRuntime implements PacmanGame {
  private loop: FixedStepLoop | null = null;
  private composed: ComposedGame | null = null;
  private started = false;
  private destroyed = false;

  constructor(private readonly compositionRoot: GameCompositionRoot) {}

  async start(): Promise<void> {
    if (this.started || this.destroyed) {
      return;
    }

    this.composed = await this.compositionRoot.compose(this.runtimeControl);

    this.loop = new FixedStepLoop(this.update, this.render);
    this.started = true;
    this.composed.updateSystems.forEach((system) => {
      system.start?.();
    });
    this.loop.start();
  }

  pause(): void {
    if (!this.composed) {
      return;
    }

    this.composed.world.isMoving = false;
    this.composed.scheduler.setPaused(true);
  }

  resume(): void {
    if (!this.composed) {
      return;
    }

    this.composed.world.isMoving = true;
    this.composed.scheduler.setPaused(false);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.started = false;

    this.loop?.stop();
    this.loop = null;

    const uniqueSystems = new Set([...(this.composed?.renderSystems ?? []), ...(this.composed?.updateSystems ?? [])]);
    this.destroySystems(Array.from(uniqueSystems));

    this.composed?.scheduler.clear();
    this.composed?.input.destroy();
    this.composed?.destroy();
    this.composed = null;
  }

  private readonly runtimeControl: RuntimeControl = {
    pause: () => {
      this.pause();
    },
    resume: () => {
      this.resume();
    },
    togglePause: () => {
      if (!this.composed) {
        return;
      }
      if (this.composed.world.isMoving) {
        this.pause();
      } else {
        this.resume();
      }
    },
  };

  private readonly update = (deltaMs: number): void => {
    if (!this.composed || this.destroyed) {
      return;
    }

    if (!this.composed.world.isMoving) {
      this.composed.updateSystems.forEach((system) => {
        if (system.runsWhenPaused) {
          system.update(deltaMs);
        }
      });
      return;
    }

    this.composed.world.nextTick();
    this.composed.scheduler.update(deltaMs);

    this.composed.updateSystems.forEach((system) => {
      system.update(deltaMs);
    });
  };

  private readonly render = (alpha: number): void => {
    if (!this.composed || this.destroyed) {
      return;
    }

    this.composed.renderSystems.forEach((system) => {
      system.render(alpha);
    });
  };

  private destroySystems(systems: Array<UpdateCapableSystem | RenderCapableSystem>): void {
    systems.forEach((system) => {
      system.destroy?.();
    });
  }
}
