import { LegacyMenuController } from '../menu/LegacyMenuController';
import { PacmanExperience, PacmanRuntime, PacmanRuntimeFactory } from './contracts';

interface PacmanExperienceOptions {
    mountId?: string;
    createGame: PacmanRuntimeFactory;
    autoStart?: boolean;
}

interface WebkitFullscreenDocument extends Document {
    webkitFullscreenEnabled?: boolean;
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitFullscreenElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
}

const DEFAULT_MOUNT_ID = 'game-root';
const FULLSCREEN_ENTER_LABEL = 'Full Screen';
const FULLSCREEN_EXIT_LABEL = 'Exit Full Screen';
const FULLSCREEN_UNAVAILABLE_LABEL = 'Full Screen N/A';
const FULLSCREEN_ERROR_LABEL = 'Fullscreen Blocked';
const FULLSCREEN_ERROR_DURATION_MS = 2_000;

export class PacmanExperienceRuntime implements PacmanExperience {
    private mount: HTMLElement | null = null;
    private runtimeHost: HTMLDivElement | null = null;
    private overlayHost: HTMLDivElement | null = null;
    private menu: LegacyMenuController | null = null;
    private game: PacmanRuntime | null = null;
    private fullscreenButton: HTMLButtonElement | null = null;
    private fullscreenErrorTimeout: number | null = null;
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

        this.orientationGuard = document.createElement('div');
        this.orientationGuard.className = 'mobile-orientation-guard';
        this.orientationGuard.innerHTML =
            '<div class="mobile-orientation-card"><p>Rotate your phone</p><span>Pac-Man is available in landscape mode only.</span></div>';

        this.fullscreenButton = this.createFullscreenButton();

        this.mount.append(
            this.runtimeHost,
            this.overlayHost,
            this.orientationGuard,
            this.fullscreenButton
        );

        const autoStart = this.options.autoStart ?? false;

        if (!autoStart) {
            this.menu = new LegacyMenuController({
                mount: this.overlayHost,
                onStartRequested: () => this.startGameRuntime(),
            });
        }

        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
        document.addEventListener('fullscreenerror', this.handleFullscreenError);

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

        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('fullscreenerror', this.handleFullscreenError);

        if (this.fullscreenErrorTimeout !== null) {
            window.clearTimeout(this.fullscreenErrorTimeout);
            this.fullscreenErrorTimeout = null;
        }

        this.fullscreenButton?.removeEventListener('click', this.handleFullscreenClicked);
        this.fullscreenButton?.remove();
        this.fullscreenButton = null;

        if (this.isFullscreenActive()) {
            void this.exitFullscreen().catch(() => {
                // Ignore cleanup failures from browser-level fullscreen APIs.
            });
        }

        if (this.mount) {
            this.mount.replaceChildren();
            this.mount.classList.remove('pacman-shell-root');
        }

        this.runtimeHost = null;
        this.mount = null;
    }

    private createFullscreenButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pacman-fullscreen-toggle';
        button.setAttribute('aria-label', 'Toggle full screen');
        button.addEventListener('click', this.handleFullscreenClicked);

        this.syncFullscreenButtonState(button);
        return button;
    }

    private readonly handleFullscreenClicked = (): void => {
        void this.toggleFullscreen();
    };

    private readonly handleFullscreenChange = (): void => {
        this.syncFullscreenButtonState();
    };

    private readonly handleFullscreenError = (): void => {
        this.showFullscreenErrorState();
    };

    private syncFullscreenButtonState(overrideButton?: HTMLButtonElement): void {
        const button = overrideButton ?? this.fullscreenButton;
        if (!button) {
            return;
        }

        if (!this.isFullscreenSupported()) {
            button.disabled = true;
            button.dataset.state = 'unsupported';
            button.textContent = FULLSCREEN_UNAVAILABLE_LABEL;
            button.title = 'Your browser does not support fullscreen mode.';
            button.setAttribute('aria-pressed', 'false');
            return;
        }

        if (button.dataset.state === 'error') {
            return;
        }

        const isActive = this.isFullscreenActive();
        button.disabled = false;
        button.dataset.state = isActive ? 'active' : 'inactive';
        button.textContent = isActive ? FULLSCREEN_EXIT_LABEL : FULLSCREEN_ENTER_LABEL;
        button.title = isActive ? 'Leave fullscreen mode.' : 'Enter fullscreen mode.';
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    private showFullscreenErrorState(): void {
        const button = this.fullscreenButton;
        if (!button) {
            return;
        }

        if (this.fullscreenErrorTimeout !== null) {
            window.clearTimeout(this.fullscreenErrorTimeout);
        }

        button.disabled = false;
        button.dataset.state = 'error';
        button.textContent = FULLSCREEN_ERROR_LABEL;
        button.title = 'The browser blocked this fullscreen request.';

        this.fullscreenErrorTimeout = window.setTimeout(() => {
            this.fullscreenErrorTimeout = null;
            this.syncFullscreenButtonState();
        }, FULLSCREEN_ERROR_DURATION_MS);
    }

    private getFullscreenDocument(): WebkitFullscreenDocument {
        return document as WebkitFullscreenDocument;
    }

    private isFullscreenSupported(): boolean {
        const fullscreenDocument = this.getFullscreenDocument();
        const webkitRoot = document.documentElement as WebkitFullscreenElement;

        return Boolean(
            document.fullscreenEnabled ||
                fullscreenDocument.webkitFullscreenEnabled ||
                typeof document.documentElement.requestFullscreen === 'function' ||
                typeof webkitRoot.webkitRequestFullscreen === 'function'
        );
    }

    private isFullscreenActive(): boolean {
        const fullscreenDocument = this.getFullscreenDocument();
        return Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement);
    }

    private async toggleFullscreen(): Promise<void> {
        if (!this.isFullscreenSupported()) {
            this.syncFullscreenButtonState();
            return;
        }

        try {
            if (this.isFullscreenActive()) {
                await this.exitFullscreen();
            } else {
                await this.requestFullscreen(document.documentElement);
            }
        } catch (error) {
            console.warn('Failed to toggle fullscreen mode.', error);
            this.showFullscreenErrorState();
            return;
        }

        this.syncFullscreenButtonState();
    }

    private async requestFullscreen(target: HTMLElement): Promise<void> {
        if (typeof target.requestFullscreen === 'function') {
            await target.requestFullscreen();
            return;
        }

        const webkitTarget = target as WebkitFullscreenElement;
        if (typeof webkitTarget.webkitRequestFullscreen === 'function') {
            await Promise.resolve(webkitTarget.webkitRequestFullscreen());
            return;
        }

        throw new Error('Fullscreen API is unavailable.');
    }

    private async exitFullscreen(): Promise<void> {
        if (typeof document.exitFullscreen === 'function') {
            await document.exitFullscreen();
            return;
        }

        const fullscreenDocument = this.getFullscreenDocument();
        if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
            await Promise.resolve(fullscreenDocument.webkitExitFullscreen());
            return;
        }

        throw new Error('Fullscreen exit API is unavailable.');
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
