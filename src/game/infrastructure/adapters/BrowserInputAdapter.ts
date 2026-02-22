import { InputManager } from '../../../engine/input';
import type { PointerState } from '../../../engine/input';
import type { Direction } from '../../domain/valueObjects/Direction';
import { MobileSwipeController } from './MobileSwipeController';

export type { PointerState };

export class BrowserInputAdapter {
  private readonly input: InputManager;
  private readonly swipe: MobileSwipeController;

  constructor(element: HTMLElement) {
    this.input = new InputManager(element);
    this.swipe = new MobileSwipeController(element);
  }

  isKeyDown(code: string): boolean {
    return this.input.isKeyDown(code);
  }

  isSwipeInputEnabled(): boolean {
    return this.swipe.isEnabled();
  }

  getSwipeDirection(): Direction | null {
    return this.swipe.getDirection();
  }

  onKeyDown(listener: (_event: KeyboardEvent) => void): () => void {
    return this.input.onKeyDown(listener);
  }

  onPointerMove(listener: (_pointer: PointerState) => void): () => void {
    return this.input.onPointerMove(listener);
  }

  onPointerDown(listener: (_pointer: PointerState) => void): () => void {
    return this.input.onPointerDown(listener);
  }

  onPointerUp(listener: (_pointer: PointerState) => void): () => void {
    return this.input.onPointerUp(listener);
  }

  destroy(): void {
    this.swipe.destroy();
    this.input.destroy();
  }
}
