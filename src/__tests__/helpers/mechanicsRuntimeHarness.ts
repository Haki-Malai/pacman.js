import { GameCompositionRoot } from '../../game/app/GameCompositionRoot';
import { GameRuntime } from '../../game/app/GameRuntime';
import { ComposedGame, RenderCapableSystem, UpdateCapableSystem } from '../../game/app/contracts';
import { MechanicsDomainHarness, MechanicsDomainHarnessOptions } from './mechanicsDomainHarness';

type FrameCallback = (timestamp: number) => void;

interface StubWindow {
  requestAnimationFrame: (_callback: FrameCallback) => number;
  cancelAnimationFrame: (_id: number) => void;
}

function wrapUpdateSystem(name: string, system: UpdateCapableSystem, order: string[]): UpdateCapableSystem {
  return {
    runsWhenPaused: system.runsWhenPaused,
    start: () => {
      system.start?.();
    },
    update: (deltaMs) => {
      order.push(name);
      system.update(deltaMs);
    },
    destroy: () => {
      system.destroy?.();
    },
  };
}

function makeNoopUpdateSystem(name: string, order: string[], runsWhenPaused = false): UpdateCapableSystem {
  return {
    runsWhenPaused,
    update: () => {
      order.push(name);
    },
  };
}

function makeNoopRenderSystem(): RenderCapableSystem {
  return {
    render: () => {
      // no-op for runtime mechanics harness
    },
  };
}

export class MechanicsRuntimeHarness {
  readonly domainHarness: MechanicsDomainHarness;
  readonly updateOrder: string[] = [];

  private readonly runtime: GameRuntime;
  private nextFrame: FrameCallback | null = null;
  private frameId = 0;
  private originalWindow: unknown;

  constructor(options: MechanicsDomainHarnessOptions = {}) {
    this.domainHarness = new MechanicsDomainHarness({
      ...options,
      autoStartSystems: false,
    });

    this.originalWindow = globalThis.window;
    const stubWindow: StubWindow = {
      requestAnimationFrame: (callback) => {
        this.nextFrame = callback;
        this.frameId += 1;
        return this.frameId;
      },
      cancelAnimationFrame: () => {
        // no-op
      },
    };

    Object.defineProperty(globalThis, 'window', {
      value: stubWindow,
      configurable: true,
      writable: true,
    });

    const compositionRoot = {
      compose: async () => this.compose(),
    } as unknown as GameCompositionRoot;

    this.runtime = new GameRuntime(compositionRoot);
  }

  async start(): Promise<void> {
    await this.runtime.start();
  }

  pause(): void {
    this.runtime.pause();
  }

  resume(): void {
    this.runtime.resume();
  }

  driveFrame(timestamp: number): void {
    const callback = this.nextFrame;
    if (!callback) {
      return;
    }
    callback(timestamp);
  }

  clearOrder(): void {
    this.updateOrder.length = 0;
  }

  destroy(): void {
    this.runtime.destroy();
    this.domainHarness.destroy();

    Object.defineProperty(globalThis, 'window', {
      value: this.originalWindow,
      configurable: true,
      writable: true,
    });
  }

  private compose(): Promise<ComposedGame> {
    const updateSystems: UpdateCapableSystem[] = [
      makeNoopUpdateSystem('InputSystem', this.updateOrder),
      wrapUpdateSystem('PacmanMovementSystem', this.domainHarness.pacmanSystem, this.updateOrder),
      wrapUpdateSystem('GhostReleaseSystem', this.domainHarness.ghostReleaseSystem, this.updateOrder),
      wrapUpdateSystem('GhostMovementSystem', this.domainHarness.ghostMovementSystem, this.updateOrder),
      wrapUpdateSystem('AnimationSystem', this.domainHarness.animationSystem, this.updateOrder),
      makeNoopUpdateSystem('CameraSystem', this.updateOrder),
      makeNoopUpdateSystem('HudSystem', this.updateOrder),
      makeNoopUpdateSystem('DebugOverlaySystem', this.updateOrder, true),
    ];

    const renderSystems: RenderCapableSystem[] = [makeNoopRenderSystem()];

    return Promise.resolve({
      world: this.domainHarness.world,
      renderer: {} as never,
      input: {
        destroy: () => {
          // no-op
        },
      } as never,
      scheduler: this.domainHarness.scheduler,
      updateSystems,
      renderSystems,
      destroy: () => {
        // no-op
      },
    });
  }
}
