import {
  COARSE_POINTER_MEDIA_QUERY,
  MOBILE_SWIPE_AXIS_LOCK_RATIO,
  MOBILE_SWIPE_THRESHOLD_PX,
  MOBILE_TAP_MAX_DELTA_PX,
} from '../../config/constants';
import type { Direction } from '../domain/valueObjects/Direction';
import { WorldState } from '../domain/world/WorldState';
import { BrowserInputAdapter, PointerState } from '../infrastructure/adapters/BrowserInputAdapter';

interface PauseController {
  togglePause(): void;
}

interface TouchGesture {
  pointerId: number;
  startX: number;
  startY: number;
  hasCommittedSwipe: boolean;
}

const DIRECTIONAL_KEY_PRIORITY: ReadonlyArray<{ codes: readonly string[]; direction: Direction }> = [
  { codes: ['ArrowLeft', 'KeyA'], direction: 'left' },
  { codes: ['ArrowRight', 'KeyD'], direction: 'right' },
  { codes: ['ArrowUp', 'KeyW'], direction: 'up' },
  { codes: ['ArrowDown', 'KeyS'], direction: 'down' },
];

export class InputSystem {
  private disposers: Array<() => void> = [];
  private activeTouchGesture: TouchGesture | null = null;

  constructor(
    private readonly input: BrowserInputAdapter,
    private readonly world: WorldState,
    private readonly pauseController: PauseController,
  ) {}

  start(): void {
    this.disposers.push(this.input.onKeyDown((event) => this.handleKeyDown(event)));
    this.disposers.push(this.input.onPointerMove((pointer) => this.handlePointerMove(pointer)));
    this.disposers.push(this.input.onPointerDown((pointer) => this.handlePointerDown(pointer)));
    this.disposers.push(this.input.onPointerUp((pointer) => this.handlePointerUp(pointer)));
    this.disposers.push(this.input.onPointerCancel((pointer) => this.handlePointerCancel(pointer)));
  }

  update(): void {
    const keyboardDirection = this.getDirectionalKeyboardIntent();
    if (keyboardDirection) {
      this.world.pacman.direction.next = keyboardDirection;
    }
  }

  destroy(): void {
    this.disposers.forEach((dispose) => {
      dispose();
    });
    this.disposers = [];
    this.activeTouchGesture = null;
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

    const gesture = this.getActiveGesture(pointer.pointerId);
    if (!gesture || gesture.hasCommittedSwipe || this.hasDirectionalKeyboardInput()) {
      return;
    }

    const swipeDirection = this.resolveSwipeDirection(gesture, pointer);
    if (!swipeDirection) {
      return;
    }

    this.world.pacman.direction.next = swipeDirection;
    gesture.hasCommittedSwipe = true;
  }

  private handlePointerDown(pointer: PointerState): void {
    this.world.pointerScreen = { x: pointer.x, y: pointer.y };

    if (!this.isTouchLikePointer(pointer)) {
      this.pauseController.togglePause();
      return;
    }

    this.activeTouchGesture = {
      pointerId: pointer.pointerId,
      startX: pointer.x,
      startY: pointer.y,
      hasCommittedSwipe: false,
    };
  }

  private handlePointerUp(pointer: PointerState): void {
    const gesture = this.getActiveGesture(pointer.pointerId);
    if (!gesture) {
      return;
    }

    if (this.isTapGesture(gesture, pointer)) {
      this.pauseController.togglePause();
    }

    this.activeTouchGesture = null;
  }

  private handlePointerCancel(pointer: PointerState): void {
    if (this.activeTouchGesture?.pointerId === pointer.pointerId) {
      this.activeTouchGesture = null;
    }
  }

  private getActiveGesture(pointerId: number): TouchGesture | null {
    if (!this.activeTouchGesture || this.activeTouchGesture.pointerId !== pointerId) {
      return null;
    }

    return this.activeTouchGesture;
  }

  private isTapGesture(gesture: TouchGesture, pointer: PointerState): boolean {
    if (gesture.hasCommittedSwipe) {
      return false;
    }

    const { absX, absY } = this.getGestureMagnitude(gesture, pointer);
    return Math.max(absX, absY) <= MOBILE_TAP_MAX_DELTA_PX;
  }

  private resolveSwipeDirection(gesture: TouchGesture, pointer: PointerState): Direction | null {
    const { dx, dy, absX, absY } = this.getGestureMagnitude(gesture, pointer);
    const dominant = Math.max(absX, absY);

    if (dominant < MOBILE_SWIPE_THRESHOLD_PX) {
      return null;
    }

    const minor = Math.min(absX, absY);
    if (minor > 0 && dominant / minor < MOBILE_SWIPE_AXIS_LOCK_RATIO) {
      return null;
    }

    if (absX >= absY) {
      return dx >= 0 ? 'right' : 'left';
    }

    return dy >= 0 ? 'down' : 'up';
  }

  private getGestureMagnitude(
    gesture: Pick<TouchGesture, 'startX' | 'startY'>,
    pointer: Pick<PointerState, 'x' | 'y'>,
  ): { dx: number; dy: number; absX: number; absY: number } {
    const dx = pointer.x - gesture.startX;
    const dy = pointer.y - gesture.startY;

    return {
      dx,
      dy,
      absX: Math.abs(dx),
      absY: Math.abs(dy),
    };
  }

  private hasDirectionalKeyboardInput(): boolean {
    return this.getDirectionalKeyboardIntent() !== null;
  }

  private getDirectionalKeyboardIntent(): Direction | null {
    for (const intent of DIRECTIONAL_KEY_PRIORITY) {
      if (intent.codes.some((code) => this.input.isKeyDown(code))) {
        return intent.direction;
      }
    }

    return null;
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
