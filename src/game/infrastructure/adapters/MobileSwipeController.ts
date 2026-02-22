import { COARSE_POINTER_MEDIA_QUERY } from '../../../config/constants';
import type { Direction } from '../../domain/valueObjects/Direction';

const SWIPE_DEAD_ZONE_PX = 18;
const SWIPE_SWITCH_DISTANCE_FACTOR = 1.2;
const SWIPE_DIRECTION_LOCK_RATIO = 1.25;

function isHorizontal(direction: Direction): boolean {
  return direction === 'left' || direction === 'right';
}

function subscribeToMediaQueryChange(mediaQuery: MediaQueryList, listener: () => void): () => void {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }

  const legacyListener = listener as unknown as (_event: MediaQueryListEvent) => void;
  mediaQuery.addListener(legacyListener);
  return () => {
    mediaQuery.removeListener(legacyListener);
  };
}

export function resolveSwipeDirection(deltaX: number, deltaY: number, deadZonePx: number): Direction | null {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < deadZonePx) {
    return null;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX >= 0 ? 'right' : 'left';
  }

  return deltaY >= 0 ? 'down' : 'up';
}

export interface ResolveSwipeDirectionWithLockParams {
  currentDirection: Direction | null;
  deltaX: number;
  deltaY: number;
  deadZonePx: number;
  switchDistancePx: number;
  directionLockRatio: number;
}

export function resolveSwipeDirectionWithLock(params: ResolveSwipeDirectionWithLockParams): Direction | null {
  const { currentDirection, deltaX, deltaY, deadZonePx, switchDistancePx, directionLockRatio } = params;
  const candidateDirection = resolveSwipeDirection(deltaX, deltaY, deadZonePx);

  if (!candidateDirection) {
    return currentDirection;
  }

  if (!currentDirection || currentDirection === candidateDirection) {
    return candidateDirection;
  }

  const switchingAxis = isHorizontal(currentDirection) !== isHorizontal(candidateDirection);
  if (!switchingAxis) {
    return candidateDirection;
  }

  const candidateDistance = isHorizontal(candidateDirection) ? Math.abs(deltaX) : Math.abs(deltaY);
  const crossAxisDistance = isHorizontal(candidateDirection) ? Math.abs(deltaY) : Math.abs(deltaX);

  if (candidateDistance < switchDistancePx) {
    return currentDirection;
  }

  if (candidateDistance < crossAxisDistance * directionLockRatio) {
    return currentDirection;
  }

  return candidateDirection;
}

export class MobileSwipeController {
  private readonly mediaQuery: MediaQueryList | null;
  private readonly unsubscribeMediaQueryChange: (() => void) | null;
  private readonly deadZonePx: number;
  private readonly switchDistancePx: number;
  private readonly directionLockRatio: number;

  private activePointerId: number | null = null;
  private direction: Direction | null = null;
  private referenceX = 0;
  private referenceY = 0;

  constructor(private readonly element: HTMLElement) {
    this.deadZonePx = SWIPE_DEAD_ZONE_PX;
    this.switchDistancePx = this.deadZonePx * SWIPE_SWITCH_DISTANCE_FACTOR;
    this.directionLockRatio = SWIPE_DIRECTION_LOCK_RATIO;
    this.mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(COARSE_POINTER_MEDIA_QUERY)
        : null;
    this.unsubscribeMediaQueryChange = this.mediaQuery
      ? subscribeToMediaQueryChange(this.mediaQuery, this.handleMediaQueryChange)
      : null;

    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerUp);
    this.element.addEventListener('lostpointercapture', this.handleLostPointerCapture);
  }

  isEnabled(): boolean {
    return this.mediaQuery?.matches ?? false;
  }

  getDirection(): Direction | null {
    if (!this.isEnabled()) {
      return null;
    }

    return this.direction;
  }

  destroy(): void {
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerUp);
    this.element.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.unsubscribeMediaQueryChange?.();

    this.resetGesture();
  }

  private readonly handleMediaQueryChange = (): void => {
    if (!this.isEnabled()) {
      this.resetGesture();
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.isEnabled() || event.pointerType !== 'touch' || this.activePointerId !== null) {
      return;
    }

    event.preventDefault();

    this.activePointerId = event.pointerId;
    this.direction = null;
    this.referenceX = event.clientX;
    this.referenceY = event.clientY;
    this.trySetPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    event.preventDefault();
    this.updateDirection(event.clientX, event.clientY);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    event.preventDefault();
    this.releasePointerCapture(event.pointerId);
    this.resetGesture();
  };

  private readonly handleLostPointerCapture = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.resetGesture();
  };

  private updateDirection(clientX: number, clientY: number): void {
    const deltaX = clientX - this.referenceX;
    const deltaY = clientY - this.referenceY;

    const nextDirection = resolveSwipeDirectionWithLock({
      currentDirection: this.direction,
      deltaX,
      deltaY,
      deadZonePx: this.deadZonePx,
      switchDistancePx: this.switchDistancePx,
      directionLockRatio: this.directionLockRatio,
    });

    if (!nextDirection) {
      return;
    }

    if (nextDirection !== this.direction) {
      this.direction = nextDirection;
      this.referenceX = clientX;
      this.referenceY = clientY;
      return;
    }

    if (isHorizontal(nextDirection)) {
      this.referenceX = clientX;
      return;
    }

    this.referenceY = clientY;
  }

  private trySetPointerCapture(pointerId: number): void {
    try {
      this.element.setPointerCapture(pointerId);
    } catch {
      // Ignore pointer capture failures and continue with best-effort swipe tracking.
    }
  }

  private releasePointerCapture(pointerId: number): void {
    if (this.element.hasPointerCapture(pointerId)) {
      this.element.releasePointerCapture(pointerId);
    }
  }

  private resetGesture(): void {
    if (this.activePointerId !== null) {
      this.releasePointerCapture(this.activePointerId);
    }

    this.activePointerId = null;
    this.direction = null;
    this.referenceX = 0;
    this.referenceY = 0;
  }
}
