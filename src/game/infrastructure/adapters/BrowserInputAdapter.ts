import { InputManager } from '../../../engine/input';
import type { PointerState } from '../../../engine/input';

export type { PointerState };

export class BrowserInputAdapter {
  private readonly input: InputManager;

  constructor(element: HTMLElement) {
    this.input = new InputManager(element);
  }

  isKeyDown(code: string): boolean {
    return this.input.isKeyDown(code);
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
    this.input.destroy();
  }
}
