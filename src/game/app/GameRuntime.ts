import { FixedStepLoop } from '../../engine/loop';
import { ComposedGame, PacmanGame, RenderCapableSystem, RuntimeControl, UpdateCapableSystem } from './contracts';
import { GameCompositionRoot } from './GameCompositionRoot';

export class GameRuntime implements PacmanGame {
  private loop: FixedStepLoop | null = null;
  private composed: ComposedGame | null = null;
  private started = false;
  private destroyed = false;
  private pausedByFocusLoss = false;
  private focusListenersBound = false;

  constructor(private readonly compositionRoot: GameCompositionRoot) {}

  async start(): Promise<void> {
    if (this.started || this.destroyed) {
      return;
    }

    this.composed = await this.compositionRoot.compose(this.runtimeControl);

    this.loop = new FixedStepLoop(this.update, this.render);
    this.started = true;
    this.bindFocusListeners();
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

    this.pausedByFocusLoss = false;
    this.composed.world.isMoving = true;
    this.composed.scheduler.setPaused(false);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.started = false;
    this.unbindFocusListeners();
    this.pausedByFocusLoss = false;

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

  private bindFocusListeners(): void {
    if (this.focusListenersBound || !this.canBindWindowListeners()) {
      return;
    }

    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    if (this.canBindDocumentListeners()) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.focusListenersBound = true;
  }

  private unbindFocusListeners(): void {
    if (!this.focusListenersBound || !this.canBindWindowListeners()) {
      return;
    }

    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    if (this.canBindDocumentListeners()) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.focusListenersBound = false;
  }

  private readonly handleWindowBlur = (): void => {
    this.handleFocusLost();
  };

  private readonly handleWindowFocus = (): void => {
    this.handleFocusReturned();
  };

  private readonly handleVisibilityChange = (): void => {
    if (typeof document === 'undefined' || !('hidden' in document)) {
      return;
    }

    if (document.hidden) {
      this.handleFocusLost();
      return;
    }

    this.handleFocusReturned();
  };

  private canBindWindowListeners(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function' &&
      typeof window.removeEventListener === 'function'
    );
  }

  private canBindDocumentListeners(): boolean {
    return (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function' &&
      typeof document.removeEventListener === 'function'
    );
  }

  private handleFocusLost(): void {
    if (!this.started || this.destroyed || !this.composed || !this.composed.world.isMoving) {
      return;
    }

    this.pause();
    this.pausedByFocusLoss = true;
  }

  private handleFocusReturned(): void {
    if (!this.started || this.destroyed || !this.composed || !this.pausedByFocusLoss) {
      return;
    }

    this.resume();
  }

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
