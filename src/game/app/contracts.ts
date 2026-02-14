import { WorldState } from '../domain/world/WorldState';
import { BrowserInputAdapter } from '../infrastructure/adapters/BrowserInputAdapter';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { TimerSchedulerAdapter } from '../infrastructure/adapters/TimerSchedulerAdapter';

export interface PacmanGame {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface RuntimeControl {
  pause(): void;
  resume(): void;
  togglePause(): void;
}

export interface UpdateCapableSystem {
  runsWhenPaused?: boolean;
  start?(): void;
  update(deltaMs: number): void;
  destroy?(): void;
}

export interface RenderCapableSystem {
  render(alpha: number): void;
  destroy?(): void;
}

export interface ComposedGame {
  world: WorldState;
  renderer: CanvasRendererAdapter;
  input: BrowserInputAdapter;
  scheduler: TimerSchedulerAdapter;
  updateSystems: UpdateCapableSystem[];
  renderSystems: RenderCapableSystem[];
  destroy: () => void;
}
