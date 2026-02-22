import type { Direction } from '../../domain/valueObjects/Direction';

const THUMBSTICK_DIAMETER_PX = 132;
const KNOB_DIAMETER_PX = 56;
const THUMBSTICK_DEAD_ZONE_FACTOR = 0.35;
const THUMBSTICK_HUD_CLEARANCE_REM = 4;
const THUMBSTICK_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function resolveThumbstickDirection(
  offsetX: number,
  offsetY: number,
  deadZoneRadius: number,
): Direction | null {
  const distance = Math.hypot(offsetX, offsetY);
  if (distance < deadZoneRadius) {
    return null;
  }

  if (Math.abs(offsetX) > Math.abs(offsetY)) {
    return offsetX >= 0 ? 'right' : 'left';
  }

  return offsetY >= 0 ? 'down' : 'up';
}

export class MobileThumbstickController {
  private readonly root: HTMLDivElement;
  private readonly pad: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly mediaQuery: MediaQueryList;
  private readonly maxOffset: number;
  private readonly deadZoneRadius: number;
  private activePointerId: number | null = null;
  private direction: Direction | null = null;

  constructor(private readonly mount: HTMLElement) {
    this.maxOffset = (THUMBSTICK_DIAMETER_PX - KNOB_DIAMETER_PX) / 2;
    this.deadZoneRadius = this.maxOffset * THUMBSTICK_DEAD_ZONE_FACTOR;

    this.root = document.createElement('div');
    this.pad = document.createElement('div');
    this.knob = document.createElement('div');

    this.root.setAttribute('aria-hidden', 'true');
    this.pad.setAttribute('aria-hidden', 'true');
    this.knob.setAttribute('aria-hidden', 'true');

    this.root.style.position = 'absolute';
    this.root.style.inset = '0';
    this.root.style.zIndex = '25';
    this.root.style.pointerEvents = 'none';
    this.root.style.display = 'flex';
    this.root.style.justifyContent = 'flex-end';
    this.root.style.alignItems = 'flex-end';

    this.pad.style.position = 'relative';
    this.pad.style.width = `${THUMBSTICK_DIAMETER_PX}px`;
    this.pad.style.height = `${THUMBSTICK_DIAMETER_PX}px`;
    this.pad.style.borderRadius = '9999px';
    this.pad.style.marginRight = 'max(env(safe-area-inset-right), 1rem)';
    this.pad.style.marginBottom = `max(calc(env(safe-area-inset-bottom) + ${THUMBSTICK_HUD_CLEARANCE_REM}rem), ${THUMBSTICK_HUD_CLEARANCE_REM}rem)`;
    this.pad.style.pointerEvents = 'auto';
    this.pad.style.touchAction = 'none';
    this.pad.style.background = 'radial-gradient(circle at 30% 30%, rgba(250, 204, 21, 0.2), rgba(0, 0, 0, 0.55))';
    this.pad.style.border = '2px solid rgba(250, 204, 21, 0.45)';
    this.pad.style.backdropFilter = 'blur(4px)';
    this.pad.style.boxShadow = '0 0 25px rgba(250, 204, 21, 0.25), inset 0 0 35px rgba(0, 0, 0, 0.45)';

    this.knob.style.position = 'absolute';
    this.knob.style.left = '50%';
    this.knob.style.top = '50%';
    this.knob.style.width = `${KNOB_DIAMETER_PX}px`;
    this.knob.style.height = `${KNOB_DIAMETER_PX}px`;
    this.knob.style.borderRadius = '9999px';
    this.knob.style.background = 'linear-gradient(145deg, rgba(252, 211, 77, 0.95), rgba(234, 179, 8, 0.8))';
    this.knob.style.border = '2px solid rgba(12, 10, 9, 0.6)';
    this.knob.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.35)';
    this.knob.style.transition = 'transform 40ms linear';

    this.pad.append(this.knob);
    this.root.append(this.pad);
    this.mount.append(this.root);

    this.mediaQuery = window.matchMedia(THUMBSTICK_MEDIA_QUERY);
    this.syncVisibility();

    this.pad.addEventListener('pointerdown', this.handlePointerDown);
    this.pad.addEventListener('pointermove', this.handlePointerMove);
    this.pad.addEventListener('pointerup', this.handlePointerUp);
    this.pad.addEventListener('pointercancel', this.handlePointerUp);
    this.pad.addEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.mediaQuery.addEventListener('change', this.handleMediaQueryChange);

    this.renderKnob(0, 0);
  }

  getDirection(): Direction | null {
    if (!this.isEnabled()) {
      return null;
    }

    return this.direction;
  }

  destroy(): void {
    this.pad.removeEventListener('pointerdown', this.handlePointerDown);
    this.pad.removeEventListener('pointermove', this.handlePointerMove);
    this.pad.removeEventListener('pointerup', this.handlePointerUp);
    this.pad.removeEventListener('pointercancel', this.handlePointerUp);
    this.pad.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.mediaQuery.removeEventListener('change', this.handleMediaQueryChange);
    this.reset();
    this.root.remove();
  }

  private readonly handleMediaQueryChange = (): void => {
    this.syncVisibility();
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.isEnabled() || this.activePointerId !== null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.activePointerId = event.pointerId;
    this.pad.setPointerCapture(event.pointerId);
    this.updateFromPointer(event.clientX, event.clientY);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    event.preventDefault();
    this.updateFromPointer(event.clientX, event.clientY);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    event.preventDefault();
    this.releasePointerCapture(event.pointerId);
    this.reset();
  };

  private readonly handleLostPointerCapture = (): void => {
    this.reset();
  };

  private syncVisibility(): void {
    if (this.isEnabled()) {
      this.root.style.display = 'flex';
      return;
    }

    this.root.style.display = 'none';
    this.reset();
  }

  private isEnabled(): boolean {
    return this.mediaQuery.matches;
  }

  private updateFromPointer(clientX: number, clientY: number): void {
    const rect = this.pad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    const distance = Math.hypot(deltaX, deltaY);
    const clampedDistance = clamp(distance, 0, this.maxOffset);
    const scale = distance > 0 ? clampedDistance / distance : 0;

    const offsetX = deltaX * scale;
    const offsetY = deltaY * scale;

    this.renderKnob(offsetX, offsetY);
    this.direction = resolveThumbstickDirection(offsetX, offsetY, this.deadZoneRadius);
  }

  private renderKnob(offsetX: number, offsetY: number): void {
    this.knob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }

  private releasePointerCapture(pointerId: number): void {
    if (this.pad.hasPointerCapture(pointerId)) {
      this.pad.releasePointerCapture(pointerId);
    }
  }

  private reset(): void {
    if (this.activePointerId !== null) {
      this.releasePointerCapture(this.activePointerId);
    }

    this.activePointerId = null;
    this.direction = null;
    this.renderKnob(0, 0);
  }
}
