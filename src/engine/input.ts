export interface PointerState {
  x: number;
  y: number;
  buttons: number;
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  cancelled: boolean;
}

type KeyListener = (_event: KeyboardEvent) => void;
type PointerListener = (_pointer: PointerState) => void;

export class InputManager {
  private readonly element: HTMLElement;
  private readonly keyDown = new Set<string>();
  private readonly keyDownListeners = new Set<KeyListener>();
  private readonly pointerMoveListeners = new Set<PointerListener>();
  private readonly pointerDownListeners = new Set<PointerListener>();
  private readonly pointerUpListeners = new Set<PointerListener>();

  constructor(element: HTMLElement) {
    this.element = element;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerCancel);
  }

  isKeyDown(code: string): boolean {
    return this.keyDown.has(code);
  }

  onKeyDown(listener: KeyListener): () => void {
    this.keyDownListeners.add(listener);
    return () => {
      this.keyDownListeners.delete(listener);
    };
  }

  onPointerMove(listener: PointerListener): () => void {
    this.pointerMoveListeners.add(listener);
    return () => {
      this.pointerMoveListeners.delete(listener);
    };
  }

  onPointerDown(listener: PointerListener): () => void {
    this.pointerDownListeners.add(listener);
    return () => {
      this.pointerDownListeners.delete(listener);
    };
  }

  onPointerUp(listener: PointerListener): () => void {
    this.pointerUpListeners.add(listener);
    return () => {
      this.pointerUpListeners.delete(listener);
    };
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    this.keyDown.clear();
    this.keyDownListeners.clear();
    this.pointerMoveListeners.clear();
    this.pointerDownListeners.clear();
    this.pointerUpListeners.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keyDown.add(event.code);
    this.keyDownListeners.forEach((listener) => {
      listener(event);
    });
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keyDown.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.keyDown.clear();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerMoveListeners.forEach((listener) => {
      listener(this.toPointerState(event));
    });
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownListeners.forEach((listener) => {
      listener(this.toPointerState(event));
    });
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.pointerUpListeners.forEach((listener) => {
      listener(this.toPointerState(event));
    });
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.pointerUpListeners.forEach((listener) => {
      listener(this.toPointerState(event, true));
    });
  };

  private toPointerState(event: PointerEvent, cancelled = false): PointerState {
    const rect = this.element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      buttons: event.buttons,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      cancelled,
    };
  }
}
