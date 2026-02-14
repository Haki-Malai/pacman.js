import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { WorldState } from '../domain/world/WorldState';
import { TilePosition } from '../domain/valueObjects/TilePosition';

interface CameraLike {
  screenToWorld(screenX: number, screenY: number): { x: number; y: number };
}

export class DebugOverlaySystem {
  readonly runsWhenPaused = true;
  private panel?: HTMLPreElement;

  constructor(
    private readonly world: WorldState,
    private readonly renderer: CanvasRendererAdapter,
    private readonly camera: CameraLike,
  ) {}

  start(): void {
    this.createPanel();
  }

  update(): void {
    if (!this.world.collisionDebugEnabled) {
      this.world.hoveredDebugTile = null;
      return;
    }

    const pointer = this.world.pointerScreen;
    if (!pointer) {
      return;
    }

    const worldPoint = this.camera.screenToWorld(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / this.world.tileSize);
    const tileY = Math.floor(worldPoint.y / this.world.tileSize);

    if (tileX < 0 || tileY < 0 || tileX >= this.world.map.width || tileY >= this.world.map.height) {
      this.world.hoveredDebugTile = null;
      return;
    }

    this.world.hoveredDebugTile = { x: tileX, y: tileY };
  }

  render(): void {
    if (!this.panel) {
      return;
    }

    if (!this.world.collisionDebugEnabled) {
      this.panel.style.display = 'none';
      this.panel.textContent = '';
      this.world.debugPanelText = '';
      return;
    }

    this.panel.style.display = 'block';

    this.renderer.beginWorld(this.camera as never);
    this.drawCollisionDebugOverlay();
    this.renderer.endWorld();

    if (!this.world.hoveredDebugTile) {
      this.world.debugPanelText = 'Collision Debug\nmove mouse over a block to inspect';
    } else {
      this.world.debugPanelText = this.getTileDebugInfo(this.world.hoveredDebugTile);
    }

    this.panel.textContent = this.world.debugPanelText;
  }

  destroy(): void {
    this.panel?.remove();
    this.panel = undefined;
  }

  private createPanel(): void {
    const panelId = 'collision-debug-panel';
    document.getElementById(panelId)?.remove();

    this.panel = document.createElement('pre');
    this.panel.id = panelId;
    this.panel.style.position = 'fixed';
    this.panel.style.left = '8px';
    this.panel.style.top = '52px';
    this.panel.style.margin = '0';
    this.panel.style.padding = '6px 8px';
    this.panel.style.color = '#ffffff';
    this.panel.style.background = 'rgba(0, 0, 0, 0.78)';
    this.panel.style.font = '12px/1.35 monospace';
    this.panel.style.whiteSpace = 'pre';
    this.panel.style.pointerEvents = 'none';
    this.panel.style.zIndex = '9999';
    this.panel.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.panel.style.borderRadius = '4px';
    this.panel.style.display = 'none';

    document.body.appendChild(this.panel);
  }

  private drawCollisionDebugOverlay(): void {
    const ctx = this.renderer.context;

    for (let y = 0; y < this.world.map.height; y += 1) {
      for (let x = 0; x < this.world.map.width; x += 1) {
        const tile = this.world.collisionGrid.getTileAt(x, y);
        if (!tile.collides && !tile.up && !tile.down && !tile.left && !tile.right && !tile.penGate) {
          continue;
        }

        const worldX = x * this.world.tileSize;
        const worldY = y * this.world.tileSize;

        if (tile.up && tile.right && tile.down && tile.left) {
          ctx.fillStyle = 'rgba(255, 51, 85, 0.06)';
          ctx.fillRect(worldX, worldY, this.world.tileSize, this.world.tileSize);
        }

        ctx.strokeStyle = tile.penGate ? '#00ffff' : '#ff3355';
        ctx.lineWidth = 1;

        if (tile.up) {
          ctx.beginPath();
          ctx.moveTo(worldX, worldY);
          ctx.lineTo(worldX + this.world.tileSize, worldY);
          ctx.stroke();
        }

        if (tile.down) {
          ctx.beginPath();
          ctx.moveTo(worldX, worldY + this.world.tileSize);
          ctx.lineTo(worldX + this.world.tileSize, worldY + this.world.tileSize);
          ctx.stroke();
        }

        if (tile.left) {
          ctx.beginPath();
          ctx.moveTo(worldX, worldY);
          ctx.lineTo(worldX, worldY + this.world.tileSize);
          ctx.stroke();
        }

        if (tile.right) {
          ctx.beginPath();
          ctx.moveTo(worldX + this.world.tileSize, worldY);
          ctx.lineTo(worldX + this.world.tileSize, worldY + this.world.tileSize);
          ctx.stroke();
        }
      }
    }

    this.drawDebugMarker(this.world.pacman.tile, '#ffdd00');
    this.world.ghosts.forEach((ghost) => {
      this.drawDebugMarker(ghost.tile, '#00ff66');
    });

    if (this.world.hoveredDebugTile) {
      this.drawDebugMarker(this.world.hoveredDebugTile, '#33ccff');
    }
  }

  private drawDebugMarker(tile: TilePosition, color: string): void {
    const x = tile.x * this.world.tileSize;
    const y = tile.y * this.world.tileSize;
    const ctx = this.renderer.context;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, this.world.tileSize - 2, this.world.tileSize - 2);
  }

  private getTileDebugInfo(tilePosition: TilePosition): string {
    const tile = this.world.map.tiles[tilePosition.y]?.[tilePosition.x];
    const collision = this.world.collisionGrid.getTileAt(tilePosition.x, tilePosition.y);

    if (!tile || tile.gid === null) {
      return [
        'Collision Debug',
        `tile: (${tilePosition.x}, ${tilePosition.y})`,
        'gid: empty',
        'edges: up:false right:false down:false left:false',
      ].join('\n');
    }

    const rotationSteps = ((Math.round(tile.rotation / (Math.PI / 2)) % 4) + 4) % 4;

    return [
      'Collision Debug',
      `tile: (${tilePosition.x}, ${tilePosition.y}) gid:${tile.gid} local:${tile.localId}`,
      `image: ${tile.imagePath}`,
      `collides:${collision.collides} penGate:${collision.penGate} portal:${collision.portal}`,
      `edges: up:${collision.up} right:${collision.right} down:${collision.down} left:${collision.left}`,
      `transform: rot:${rotationSteps * 90}deg flipX:${tile.flipX} flipY:${tile.flipY}`,
    ].join('\n');
  }
}
