import { WorldState } from '../domain/world/WorldState';

const PAUSE_OVERLAY_VISIBLE_CLASS = 'opacity-100';
const PAUSED_SCENE_CLASSES = ['grayscale', 'saturate-[0.12]', 'brightness-[0.38]', 'contrast-[0.94]'] as const;

export class PauseOverlaySystem {
  readonly runsWhenPaused = true;

  private overlay: HTMLDivElement | null = null;
  private pausedStateApplied = false;

  constructor(
    private readonly world: WorldState,
    private readonly mount: HTMLElement,
    private readonly sceneCanvas: HTMLCanvasElement,
  ) {}

  start(): void {
    this.createOverlay();
    this.applyPausePresentation();
  }

  update(): void {
    this.applyPausePresentation();
  }

  destroy(): void {
    this.sceneCanvas.classList.remove(...PAUSED_SCENE_CLASSES);
    this.overlay?.remove();
    this.overlay = null;
    this.pausedStateApplied = false;
  }

  private createOverlay(): void {
    this.mount.querySelector('[data-pause-overlay]')?.remove();

    const overlay = document.createElement('div');
    overlay.className =
      'pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/25 to-black/50 opacity-0 transition-opacity duration-200 ease-out';
    overlay.setAttribute('data-pause-overlay', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    const title = document.createElement('p');
    title.className =
      'm-0 rounded-xl border border-zinc-400/50 bg-black/70 px-5 py-3 text-center text-[clamp(2.2rem,8vw,4.8rem)] font-semibold tracking-[0.34em] text-zinc-100 shadow-[0_0_20px_rgba(0,0,0,0.6)] [text-indent:0.34em] max-sm:px-4 max-sm:text-[clamp(2rem,14vw,4rem)] max-sm:tracking-[0.24em] max-sm:[text-indent:0.24em]';
    title.textContent = 'PAUSED';

    const hint = document.createElement('p');
    hint.className =
      'm-0 rounded-md bg-black/60 px-3 py-1 text-center text-[clamp(0.72rem,2.4vw,1rem)] uppercase tracking-[0.13em] text-zinc-300 max-sm:w-[90vw] max-sm:max-w-[24rem] max-sm:text-[0.7rem] max-sm:tracking-[0.1em] max-sm:leading-[1.35]';
    hint.textContent = 'Tap or press Space to resume';

    overlay.append(title, hint);
    this.mount.appendChild(overlay);
    this.overlay = overlay;
  }

  private applyPausePresentation(): void {
    const isPaused = !this.world.isMoving;
    if (isPaused === this.pausedStateApplied) {
      return;
    }

    this.pausedStateApplied = isPaused;
    PAUSED_SCENE_CLASSES.forEach((className) => {
      this.sceneCanvas.classList.toggle(className, isPaused);
    });
    this.overlay?.classList.toggle(PAUSE_OVERLAY_VISIBLE_CLASS, isPaused);
    this.overlay?.setAttribute('aria-hidden', isPaused ? 'false' : 'true');
  }
}
