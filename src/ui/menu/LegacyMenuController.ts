type MenuStage = 'idle' | 'intro' | 'menu' | 'starting';
type IntroPhase = 'go' | 'bye' | 'hidden';

interface LegacyMenuControllerOptions {
    mount: HTMLElement;
    onStartRequested: () => Promise<void>;
}

const INTRO_BYE_MS = 2_000;
const INTRO_HIDE_MS = 3_500;
const INTRO_DURATION_MS = 4_000;
const START_ANIMATION_DURATION_MS = 950;
const MESSAGE_DURATION_MS = 2_600;

const LEGACY_AUTHOR_NAME = 'HAKI MALAI';
const LEGACY_AUTHOR_LETTER_IN_DURATIONS = [
    '1.2s',
    '1.1s',
    '0.9s',
    '1.5s',
    '1.4s',
    '1.3s',
    '1.6s',
    '0.8s',
    '1.7s',
] as const;
const LEGACY_AUTHOR_LETTER_OUT_DURATIONS = [
    '1.8s',
    '1.9s',
    '1.7s',
    '2.3s',
    '2.1s',
    '1.8s',
    '1.8s',
    '1.7s',
    '1.6s',
] as const;
const LEGACY_AUTHOR_LETTER_OUT_DELAY = '0.5s';

export class LegacyMenuController {
    private readonly root: HTMLElement;
    private readonly startButton: HTMLButtonElement;
    private readonly optionsButton: HTMLButtonElement;
    private readonly exitButton: HTMLButtonElement;
    private readonly statusLabel: HTMLParagraphElement;
    private readonly timeouts = new Set<number>();
    private stage: MenuStage = 'idle';
    private startRequested = false;

    constructor(private readonly options: LegacyMenuControllerOptions) {
        this.root = this.createRoot();
        const frame = this.createFrame();

        frame.append(this.createClickHint(), this.createCredits(), this.createLogo());

        const actions = document.createElement('div');
        actions.className = 'legacy-menu-actions';

        this.startButton = this.createButton({
            kind: 'start',
            prefix: 'S',
            accent: 'T',
            suffix: 'ART',
        });
        this.optionsButton = this.createButton({
            kind: 'options',
            prefix: 'OPT',
            accent: 'IO',
            suffix: 'NS',
        });
        this.exitButton = this.createButton({
            kind: 'exit',
            prefix: 'E',
            accent: 'X',
            suffix: 'IT',
        });

        actions.append(this.startButton, this.optionsButton, this.exitButton);

        this.statusLabel = document.createElement('p');
        this.statusLabel.className = 'legacy-menu-status';
        this.statusLabel.textContent = 'Tap or press Enter to begin.';

        frame.append(actions, this.statusLabel);
        this.root.append(frame);
        this.options.mount.append(this.root);

        this.root.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('keydown', this.handleWindowKeyDown);

        this.startButton.addEventListener('click', this.handleStartClicked);
        this.optionsButton.addEventListener('click', this.handleOptionsClicked);
        this.exitButton.addEventListener('click', this.handleExitClicked);

        this.root.focus({ preventScroll: true });
    }

    destroy(): void {
        this.timeouts.forEach((timeout) => {
            window.clearTimeout(timeout);
        });
        this.timeouts.clear();

        this.root.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('keydown', this.handleWindowKeyDown);

        this.startButton.removeEventListener('click', this.handleStartClicked);
        this.optionsButton.removeEventListener('click', this.handleOptionsClicked);
        this.exitButton.removeEventListener('click', this.handleExitClicked);

        this.root.remove();
    }

    private createRoot(): HTMLElement {
        const root = document.createElement('section');
        root.className = 'legacy-menu-root';
        root.dataset.stage = this.stage;
        root.dataset.introPhase = 'go';
        root.tabIndex = 0;
        root.setAttribute('aria-label', 'Pac-Man start menu');
        return root;
    }

    private createFrame(): HTMLElement {
        const frame = document.createElement('div');
        frame.className = 'legacy-menu-frame';
        return frame;
    }

    private createClickHint(): HTMLElement {
        const clickHint = document.createElement('p');
        clickHint.className = 'legacy-click-hint';
        clickHint.textContent = 'Click!';
        return clickHint;
    }

    private createCredits(): HTMLElement {
        const credit = document.createElement('div');
        credit.className = 'legacy-credit';

        const madeBy = document.createElement('span');
        madeBy.className = 'legacy-credit-made-by';
        madeBy.textContent = 'Made by';

        const author = document.createElement('div');
        author.className = 'legacy-credit-name';

        let letterIndex = 0;

        [...LEGACY_AUTHOR_NAME].forEach((char) => {
            const letter = document.createElement('span');
            if (char.trim().length > 0) {
                const lane =
                    letterIndex % 2 === 0
                        ? 'legacy-credit-letter--up'
                        : 'legacy-credit-letter--down';
                const inDuration =
                    LEGACY_AUTHOR_LETTER_IN_DURATIONS[letterIndex] ??
                    LEGACY_AUTHOR_LETTER_IN_DURATIONS[0];
                const outDuration =
                    LEGACY_AUTHOR_LETTER_OUT_DURATIONS[letterIndex] ??
                    LEGACY_AUTHOR_LETTER_OUT_DURATIONS[0];

                letter.className = `legacy-credit-letter ${lane}`;
                letter.style.setProperty('--legacy-letter-intro-in-duration', inDuration);
                letter.style.setProperty('--legacy-letter-intro-out-duration', outDuration);
                letter.style.setProperty(
                    '--legacy-letter-intro-out-delay',
                    LEGACY_AUTHOR_LETTER_OUT_DELAY
                );

                letterIndex += 1;
            } else {
                letter.className = 'legacy-credit-space';
            }
            letter.textContent = char;
            author.append(letter);
        });

        credit.append(madeBy, author);
        return credit;
    }

    private createLogo(): HTMLElement {
        const logo = document.createElement('div');
        logo.className = 'legacy-logo';

        const pac = this.createLogoSprite('/assets/sprites/Pac.png', 'Pac');
        pac.classList.add('legacy-logo-pac');

        const dash = this.createLogoSprite('/assets/sprites/Dash.png', 'Dash');
        dash.classList.add('legacy-logo-dash');

        const man = this.createLogoSprite('/assets/sprites/Man.png', 'Man');
        man.classList.add('legacy-logo-man');

        logo.append(pac, dash, man);
        return logo;
    }

    private createLogoSprite(src: string, alt: string): HTMLImageElement {
        const image = document.createElement('img');
        image.className = 'legacy-logo-sprite';
        image.src = src;
        image.alt = alt;
        image.draggable = false;
        return image;
    }

    private createButton(parts: {
        kind: 'start' | 'options' | 'exit';
        prefix: string;
        accent: string;
        suffix: string;
    }): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `legacy-menu-button legacy-menu-button--${parts.kind}`;

        const prefix = document.createElement('span');
        prefix.textContent = parts.prefix;

        const accent = document.createElement('span');
        accent.className = 'legacy-menu-accent';
        accent.textContent = parts.accent;

        const suffix = document.createElement('span');
        suffix.textContent = parts.suffix;

        button.append(prefix, accent, suffix);
        return button;
    }

    private readonly handlePointerDown = (): void => {
        if (this.stage !== 'idle') {
            return;
        }

        this.startIntro();
    };

    private readonly handleWindowKeyDown = (event: KeyboardEvent): void => {
        if (this.stage === 'idle') {
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                this.startIntro();
            }
            return;
        }

        if (this.stage !== 'menu') {
            return;
        }

        if (event.code === 'Enter' || event.code === 'Space') {
            event.preventDefault();
            this.handleStartClicked();
            return;
        }

        if (event.code === 'KeyO') {
            this.handleOptionsClicked();
            return;
        }

        if (event.code === 'Escape') {
            this.handleExitClicked();
        }
    };

    private startIntro(): void {
        this.showMessage('Initializing intro sequence…', true);
        this.setStage('intro');
        this.setIntroPhase('go');

        this.enqueue(() => {
            if (this.stage === 'intro') {
                this.setIntroPhase('bye');
            }
        }, INTRO_BYE_MS);

        this.enqueue(() => {
            if (this.stage === 'intro') {
                this.setIntroPhase('hidden');
            }
        }, INTRO_HIDE_MS);

        this.enqueue(() => {
            this.setStage('menu');
            this.setIntroPhase('go');
            this.showMessage('Choose START to begin your run.');
            this.startButton.focus({ preventScroll: true });
        }, INTRO_DURATION_MS);
    }

    private readonly handleStartClicked = (): void => {
        if (this.stage !== 'menu' || this.startRequested) {
            return;
        }

        this.startRequested = true;
        this.disableButtons();
        this.setStage('starting');
        this.showMessage('Loading maze…', true);

        this.enqueue(() => {
            void this.completeStartRequest();
        }, START_ANIMATION_DURATION_MS);
    };

    private async completeStartRequest(): Promise<void> {
        try {
            await this.options.onStartRequested();
            this.destroy();
        } catch (error) {
            console.error('Failed to start Pac-Man runtime.', error);
            this.startRequested = false;
            this.enableButtons();
            this.setStage('menu');
            this.showMessage('Could not start the game. Please try again.');
        }
    }

    private readonly handleOptionsClicked = (): void => {
        if (this.stage !== 'menu') {
            return;
        }
        this.showMessage('Options panel is planned and coming soon.');
    };

    private readonly handleExitClicked = (): void => {
        if (this.stage !== 'menu') {
            return;
        }
        this.showMessage('Exit is unavailable in browser mode.');
    };

    private setStage(stage: MenuStage): void {
        this.stage = stage;
        this.root.dataset.stage = stage;
    }

    private setIntroPhase(phase: IntroPhase): void {
        this.root.dataset.introPhase = phase;
    }

    private disableButtons(): void {
        this.startButton.disabled = true;
        this.optionsButton.disabled = true;
        this.exitButton.disabled = true;
    }

    private enableButtons(): void {
        this.startButton.disabled = false;
        this.optionsButton.disabled = false;
        this.exitButton.disabled = false;
    }

    private showMessage(message: string, persist = false): void {
        this.statusLabel.textContent = message;
        this.statusLabel.classList.add('legacy-menu-status--visible');

        if (persist) {
            return;
        }

        this.enqueue(() => {
            this.statusLabel.classList.remove('legacy-menu-status--visible');
        }, MESSAGE_DURATION_MS);
    }

    private enqueue(callback: () => void, delayMs: number): void {
        const timeout = window.setTimeout(() => {
            this.timeouts.delete(timeout);
            callback();
        }, delayMs);

        this.timeouts.add(timeout);
    }
}
