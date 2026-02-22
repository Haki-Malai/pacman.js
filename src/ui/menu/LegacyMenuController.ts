import { createLegacyMenuView } from './legacyMenuView';

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
    const view = createLegacyMenuView(this.stage);
    this.root = view.root;
    this.startButton = view.startButton;
    this.optionsButton = view.optionsButton;
    this.exitButton = view.exitButton;
    this.statusLabel = view.statusLabel;

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
