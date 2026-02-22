import { InputManager } from '../../../engine/input';
import type { PointerState } from '../../../engine/input';
import type { Direction } from '../../domain/valueObjects/Direction';
import { MobileThumbstickController } from './MobileThumbstickController';

export type { PointerState };

export class BrowserInputAdapter {
  private readonly input: InputManager;
  private readonly thumbstick: MobileThumbstickController | null;

  constructor(element: HTMLElement) {
    this.input = new InputManager(element);
    this.thumbstick = element.parentElement ? new MobileThumbstickController(element.parentElement) : null;
  }

  isKeyDown(code: string): boolean {
    return this.input.isKeyDown(code);
  }

  getThumbstickDirection(): Direction | null {
    return this.thumbstick?.getDirection() ?? null;
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

  destroy(): void {
    this.thumbstick?.destroy();
    this.input.destroy();
  }
}
