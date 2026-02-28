import { HudOverlayAdapter } from '../infrastructure/adapters/HudOverlayAdapter';

export class HudSystem {
  private hud?: HudOverlayAdapter;
  constructor(private readonly mount: HTMLElement) {}

  start(): void {
    this.hud = new HudOverlayAdapter(this.mount);
  }

  update(): void {
    // HUD is event-driven through game state events.
  }

  render(): void {
    // HUD is rendered in DOM overlay; no canvas draw required.
  }

  destroy(): void {
    this.hud?.destroy();
    this.hud = undefined;
  }
}
