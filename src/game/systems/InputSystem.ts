import {
  COARSE_POINTER_MEDIA_QUERY,
  MOBILE_SWIPE_AXIS_LOCK_RATIO,
  MOBILE_SWIPE_THRESHOLD_PX,
  MOBILE_TAP_MAX_DELTA_PX,
} from '../../config/constants';
import { WorldState } from '../domain/world/WorldState';
import { BrowserInputAdapter, PointerState } from '../infrastructure/adapters/BrowserInputAdapter';

interface PauseController {
  togglePause(): void;
}

interface ActiveSwipe {
  pointerId: number;
  startX: number;
  startY: number;
  committed: boolean;
}

export class InputSystem {
  private disposers: Array<() => void> = [];
  private activeSwipe: ActiveSwipe | null = null;

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

    this.disposers.push(
      this.input.onPointerUp((pointer) => {
        this.handlePointerUp(pointer);
      }),
    );

    this.disposers.push(
      this.input.onPointerCancel((pointer) => {
        this.handlePointerCancel(pointer);
      }),
    );
  }

  update(): void {
    const leftPressed = this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA');
    const rightPressed = this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD');
    const upPressed = this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW');
    const downPressed = this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS');

    if (leftPressed) {
      this.world.pacman.direction.next = 'left';
    } else if (rightPressed) {
      this.world.pacman.direction.next = 'right';
    } else if (upPressed) {
      this.world.pacman.direction.next = 'up';
    } else if (downPressed) {
      this.world.pacman.direction.next = 'down';
    }
  }

  destroy(): void {
    this.disposers.forEach((dispose) => {
      dispose();
    });
    this.disposers = [];
    this.activeSwipe = null;
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

    if (!this.activeSwipe || this.activeSwipe.pointerId !== pointer.pointerId || this.activeSwipe.committed) {
      return;
    }

    if (this.hasDirectionalKeyboardInput()) {
      return;
    }

    const dx = pointer.x - this.activeSwipe.startX;
    const dy = pointer.y - this.activeSwipe.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const dominant = Math.max(absX, absY);

    if (dominant < MOBILE_SWIPE_THRESHOLD_PX) {
      return;
    }

    const minor = Math.min(absX, absY);
    if (minor > 0 && dominant / minor < MOBILE_SWIPE_AXIS_LOCK_RATIO) {
      return;
    }

    if (absX >= absY) {
      this.world.pacman.direction.next = dx >= 0 ? 'right' : 'left';
    } else {
      this.world.pacman.direction.next = dy >= 0 ? 'down' : 'up';
    }

    this.activeSwipe.committed = true;
  }

  private handlePointerDown(pointer: PointerState): void {
    this.world.pointerScreen = { x: pointer.x, y: pointer.y };

    if (this.isTouchLikePointer(pointer)) {
      this.activeSwipe = {
        pointerId: pointer.pointerId,
        startX: pointer.x,
        startY: pointer.y,
        committed: false,
      };

      if (!this.world.isMoving) {
        this.pauseController.togglePause();
      }
      return;
    }

    this.pauseController.togglePause();
  }

  private handlePointerUp(pointer: PointerState): void {
    if (!this.activeSwipe || this.activeSwipe.pointerId !== pointer.pointerId) {
      return;
    }

    if (!this.activeSwipe.committed) {
      const dx = pointer.x - this.activeSwipe.startX;
      const dy = pointer.y - this.activeSwipe.startY;
      const delta = Math.max(Math.abs(dx), Math.abs(dy));
      if (delta <= MOBILE_TAP_MAX_DELTA_PX) {
        this.pauseController.togglePause();
      }
    }

    this.activeSwipe = null;
  }

  private handlePointerCancel(pointer: PointerState): void {
    if (this.activeSwipe?.pointerId === pointer.pointerId) {
      this.activeSwipe = null;
    }
  }

  private hasDirectionalKeyboardInput(): boolean {
    return (
      this.input.isKeyDown('ArrowLeft') ||
      this.input.isKeyDown('KeyA') ||
      this.input.isKeyDown('ArrowRight') ||
      this.input.isKeyDown('KeyD') ||
      this.input.isKeyDown('ArrowUp') ||
      this.input.isKeyDown('KeyW') ||
      this.input.isKeyDown('ArrowDown') ||
      this.input.isKeyDown('KeyS')
    );
  }

  private isTouchLikePointer(pointer: PointerState): boolean {
    if (pointer.pointerType === 'touch') {
      return true;
    }

    if (!pointer.isPrimary) {
      return false;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    return !!window.matchMedia?.(COARSE_POINTER_MEDIA_QUERY).matches;
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
