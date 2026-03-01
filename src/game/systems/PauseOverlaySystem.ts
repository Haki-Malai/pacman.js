import { WorldState } from '../domain/world/WorldState';

const PAUSE_OVERLAY_VISIBLE_CLASS = 'opacity-100';
const PAUSED_SCENE_CLASSES = ['grayscale', 'sepia', 'saturate-50', 'brightness-90', 'contrast-100'] as const;
const PAUSED_SCENE_FILTER = 'grayscale(0.72) sepia(0.22) saturate(0.55) brightness(0.86) contrast(0.96)';

export class PauseOverlaySystem {
  readonly runsWhenPaused = true;

  private overlay: HTMLDivElement | null = null;
  private pausedStateApplied = false;

  constructor(
    private readonly world: WorldState,
    private readonly mount: HTMLElement,
  ) {}

  start(): void {
    this.mount.style.transition = 'filter 200ms ease-out';
    this.createOverlay();
    this.applyPausePresentation();
  }

  update(): void {
    this.applyPausePresentation();
  }

  destroy(): void {
    this.mount.classList.remove(...PAUSED_SCENE_CLASSES);
    this.mount.style.filter = '';
    this.overlay?.remove();
    this.overlay = null;
    this.pausedStateApplied = false;
  }

  private createOverlay(): void {
    this.mount.querySelector('[data-pause-overlay]')?.remove();

    const overlay = document.createElement('div');
    overlay.className =
      'pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/25 to-black/50 opacity-0 transition-opacity duration-200 ease-out';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '60';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.gap = '0.75rem';
    overlay.style.background =
      'linear-gradient(to bottom, rgba(8, 8, 8, 0.18), rgba(8, 8, 8, 0.34)), repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.025) 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 3px)';
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    overlay.style.transition = 'opacity 200ms ease-out';
    overlay.style.pointerEvents = 'none';
    overlay.style.userSelect = 'none';
    overlay.style.webkitUserSelect = 'none';
    overlay.setAttribute('data-pause-overlay', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    const title = document.createElement('p');
    title.className =
      'm-0 rounded-xl border border-zinc-400/50 bg-black/70 px-5 py-3 text-center text-[clamp(2.2rem,8vw,4.8rem)] font-semibold tracking-[0.34em] text-zinc-100 shadow-[0_0_20px_rgba(0,0,0,0.6)] [text-indent:0.34em] max-sm:px-4 max-sm:text-[clamp(2rem,14vw,4rem)] max-sm:tracking-[0.24em] max-sm:[text-indent:0.24em]';
    title.style.margin = '0';
    title.style.padding = '0.7rem 1.2rem';
    title.style.border = '1px solid rgba(220, 220, 220, 0.55)';
    title.style.borderRadius = '0.75rem';
    title.style.background = 'rgba(0, 0, 0, 0.55)';
    title.style.color = '#f5f5f4';
    title.style.fontFamily = '"Orbitron", ui-sans-serif, system-ui, sans-serif';
    title.style.fontWeight = '900';
    title.style.fontSize = 'clamp(2.6rem, 10vw, 6rem)';
    title.style.letterSpacing = '0.34em';
    title.style.textIndent = '0.34em';
    title.style.textAlign = 'center';
    title.style.textShadow = '0 0 18px rgba(0, 0, 0, 0.7)';
    title.style.pointerEvents = 'none';
    title.style.userSelect = 'none';
    title.style.webkitUserSelect = 'none';
    title.textContent = 'PAUSED';

    const hint = document.createElement('p');
    hint.className =
      'm-0 rounded-md bg-black/60 px-3 py-1 text-center text-[clamp(0.72rem,2.4vw,1rem)] uppercase tracking-[0.13em] text-zinc-300 max-sm:w-[90vw] max-sm:max-w-[24rem] max-sm:text-[0.7rem] max-sm:tracking-[0.1em] max-sm:leading-[1.35]';
    hint.style.margin = '0';
    hint.style.padding = '0.28rem 0.6rem';
    hint.style.borderRadius = '0.375rem';
    hint.style.background = 'rgba(0, 0, 0, 0.42)';
    hint.style.color = '#e4e4e7';
    hint.style.fontFamily = '"Orbitron", ui-sans-serif, system-ui, sans-serif';
    hint.style.fontSize = 'clamp(0.78rem, 2.4vw, 1.05rem)';
    hint.style.letterSpacing = '0.12em';
    hint.style.textAlign = 'center';
    hint.style.textTransform = 'uppercase';
    hint.style.pointerEvents = 'none';
    hint.style.userSelect = 'none';
    hint.style.webkitUserSelect = 'none';
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
      this.mount.classList.toggle(className, isPaused);
    });
    this.mount.style.filter = isPaused ? PAUSED_SCENE_FILTER : '';
    this.overlay?.classList.toggle(PAUSE_OVERLAY_VISIBLE_CLASS, isPaused);
    if (this.overlay) {
      this.overlay.style.opacity = isPaused ? '1' : '0';
      this.overlay.style.visibility = isPaused ? 'visible' : 'hidden';
    }
    this.overlay?.setAttribute('aria-hidden', isPaused ? 'false' : 'true');
  }
}
