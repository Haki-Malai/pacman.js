import { LegacyMenuController } from '../menu/LegacyMenuController';
import { PacmanExperience, PacmanRuntime, PacmanRuntimeFactory } from './contracts';

interface PacmanExperienceOptions {
  mountId?: string;
  createGame: PacmanRuntimeFactory;
  autoStart?: boolean;
}

const DEFAULT_MOUNT_ID = 'game-root';

export class PacmanExperienceRuntime implements PacmanExperience {
  private mount: HTMLElement | null = null;
  private runtimeHost: HTMLDivElement | null = null;
  private overlayHost: HTMLDivElement | null = null;
  private menu: LegacyMenuController | null = null;
  private game: PacmanRuntime | null = null;
  private started = false;
  private destroyed = false;
  private launchingGame = false;

  constructor(private readonly options: PacmanExperienceOptions) {}

  start(): Promise<void> {
    if (this.started || this.destroyed) {
      return Promise.resolve();
    }

    const mountId = this.options.mountId ?? DEFAULT_MOUNT_ID;
    const mount = document.getElementById(mountId);

    if (!mount) {
      throw new Error(`Game mount element not found: #${mountId}`);
    }

    this.mount = mount;
    this.mount.replaceChildren();
    this.mount.classList.add('pacman-shell-root');

    this.runtimeHost = document.createElement('div');
    this.runtimeHost.className = 'pacman-runtime-host';
    this.runtimeHost.id = `${mountId}-runtime-host`;

    this.overlayHost = document.createElement('div');
    this.overlayHost.className = 'absolute inset-0 z-40';

    this.mount.append(this.runtimeHost, this.overlayHost);

    const autoStart = this.options.autoStart ?? false;

    if (!autoStart) {
      this.menu = new LegacyMenuController({
        mount: this.overlayHost,
        onStartRequested: () => this.startGameRuntime(),
      });
    }

    this.rewriteOverlayAssetUrls();

    this.started = true;

    if (autoStart) {
      return this.startGameRuntime();
    }

    return Promise.resolve();
  }

  pause(): void {
    this.game?.pause();
  }

  resume(): void {
    this.game?.resume();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.started = false;

    this.menu?.destroy();
    this.menu = null;

    this.game?.destroy();
    this.game = null;

    this.overlayHost?.remove();
    this.overlayHost = null;

    if (this.mount) {
      this.mount.replaceChildren();
      this.mount.classList.remove('pacman-shell-root');
    }

    this.runtimeHost = null;
    this.mount = null;
  }

  private rewriteOverlayAssetUrls(): void {
    if (!this.overlayHost) {
      return;
    }

    const imageElements = this.overlayHost.querySelectorAll<HTMLImageElement>('img[src^="/"]');
    imageElements.forEach((imageElement) => {
      const source = imageElement.getAttribute('src');
      if (!source) {
        return;
      }

      imageElement.src = this.resolveAssetUrl(source);
    });
  }

  private resolveAssetUrl(source: string): string {
    if (!source.startsWith('/') || source.startsWith('//')) {
      return source;
    }

    const baseUrl = import.meta.env.BASE_URL ?? '/';
    if (baseUrl === '/') {
      return source;
    }

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${source.slice(1)}`;
  }

  private async startGameRuntime(): Promise<void> {
    if (this.destroyed || this.launchingGame || this.game || !this.runtimeHost) {
      return;
    }

    this.launchingGame = true;
    const game = this.options.createGame({ mountId: this.runtimeHost.id });

    try {
      await game.start();

      if (this.destroyed) {
        game.destroy();
        return;
      }

      this.game = game;
      this.overlayHost?.remove();
      this.overlayHost = null;
      this.menu = null;
    } catch (error) {
      game.destroy();
      throw error;
    } finally {
      this.launchingGame = false;
    }
  }
}
