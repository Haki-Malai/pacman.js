import { Direction } from '../domain/valueObjects/Direction';
import { WorldState } from '../domain/world/WorldState';
import { BrowserInputAdapter, PointerState } from '../infrastructure/adapters/BrowserInputAdapter';

interface PauseController {
  togglePause(): void;
}

export class InputSystem {
  private disposers: Array<() => void> = [];

  constructor(
    private readonly input: BrowserInputAdapter,
    private readonly world: WorldState,
    private readonly pauseController: PauseController,
  ) {}

  start(): void {
    this.disposers.push(
      this.input.onKeyDown((event) => {
        this.handleKeyDown(event);
      }),
    );

    this.disposers.push(
      this.input.onPointerMove((pointer) => {
        this.handlePointerMove(pointer);
      }),
    );

    this.disposers.push(
      this.input.onPointerDown((pointer) => {
        this.handlePointerDown(pointer);
      }),
    );
  }

  update(): void {
    const keyboardDirection = this.getKeyboardDirection();
    const thumbstickDirection = this.input.getThumbstickDirection();
    const nextDirection = keyboardDirection ?? thumbstickDirection;

    if (nextDirection) {
      this.world.pacman.direction.next = nextDirection;
    }
  }

  destroy(): void {
    this.disposers.forEach((dispose) => {
      dispose();
    });
    this.disposers = [];
  }

  private getKeyboardDirection(): Direction | null {
    const leftPressed = this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA');
    if (leftPressed) {
      return 'left';
    }

    const rightPressed = this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD');
    if (rightPressed) {
      return 'right';
    }

    const upPressed = this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW');
    if (upPressed) {
      return 'up';
    }

    const downPressed = this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS');
    if (downPressed) {
      return 'down';
    }

    return null;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    if (event.code === 'KeyH') {
      this.world.ghosts.forEach((ghost) => {
        ghost.state.scared = !ghost.state.scared;
      });
      return;
    }

    if (event.code === 'KeyC') {
      if (event.shiftKey) {
        event.preventDefault();
        void this.copyDebugPanelText();
        return;
      }

      this.world.collisionDebugEnabled = !this.world.collisionDebugEnabled;
      if (!this.world.collisionDebugEnabled) {
        this.world.hoveredDebugTile = null;
        this.world.debugPanelText = '';
      }
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.pauseController.togglePause();
    }
  }

  private handlePointerMove(pointer: PointerState): void {
    this.world.pointerScreen = { x: pointer.x, y: pointer.y };
  }

  private handlePointerDown(pointer: PointerState): void {
    this.world.pointerScreen = { x: pointer.x, y: pointer.y };
    this.pauseController.togglePause();
  }

  private async copyDebugPanelText(): Promise<void> {
    const text = this.world.debugPanelText;
    if (!text) {
      return;
    }

    const copied = await this.copyTextToClipboard(text);
    if (!copied) {
      this.world.debugPanelText = `${text}\ncopy failed (browser blocked clipboard access)`;
    }
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Ignore clipboard API errors and try fallback copy method.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }
}
