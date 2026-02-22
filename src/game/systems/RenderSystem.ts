import { Camera2D } from '../../engine/camera';
import { buildPointLayout } from '../domain/services/PointLayoutService';
import { TilePosition } from '../domain/valueObjects/TilePosition';
import { WorldState } from '../domain/world/WorldState';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { AssetCatalog } from '../infrastructure/assets/AssetCatalog';

const BACKGROUND_COLOR = '#2d2d2d';
const POINT_COLOR = '#f7f3c6';
const POINT_RADIUS_FACTOR = 0.08;
const POWER_POINT_RADIUS_FACTOR = 0.18;

type PointCenter = {
  x: number;
  y: number;
};

export class RenderSystem {
  private readonly basePointCenters: PointCenter[];
  private readonly powerPointCenters: PointCenter[];

  constructor(
    private readonly world: WorldState,
    private readonly renderer: CanvasRendererAdapter,
    private readonly camera: Camera2D,
    private readonly assets: AssetCatalog,
  ) {
    const pointLayout = buildPointLayout({
      map: this.world.map,
      collisionGrid: this.world.collisionGrid,
      startTile: this.world.pacman.tile,
      tileSize: this.world.tileSize,
    });

    this.basePointCenters = pointLayout.basePoints.map((tile) => this.toPointCenter(tile));
    this.powerPointCenters = pointLayout.powerPoints.map((tile) => this.toPointCenter(tile));
  }

  render(): void {
    this.renderer.clear(BACKGROUND_COLOR);
    this.renderer.beginWorld(this.camera);
    this.drawMap();
    this.drawPoints();
    this.drawEntities();
    this.renderer.endWorld();
  }

  private drawMap(): void {
    this.world.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (tile.gid === null || tile.imagePath === '(empty)' || tile.imagePath === '(unknown)') {
          return;
        }

        const image = this.assets.getTileImage(tile.imagePath);
        if (!image) {
          return;
        }

        const x = tile.x * this.world.tileSize + this.world.tileSize / 2;
        const y = tile.y * this.world.tileSize + this.world.tileSize / 2;

        this.renderer.drawImageCentered(image, x, y, this.world.tileSize, this.world.tileSize, tile.rotation, tile.flipX, tile.flipY);
      });
    });
  }

  private drawPoints(): void {
    const context = this.renderer.context;
    const baseRadius = this.world.tileSize * POINT_RADIUS_FACTOR;
    const powerRadius = this.world.tileSize * POWER_POINT_RADIUS_FACTOR;

    context.fillStyle = POINT_COLOR;
    this.drawPointBatch(context, this.basePointCenters, baseRadius);
    this.drawPointBatch(context, this.powerPointCenters, powerRadius);
  }

  private drawPointBatch(context: CanvasRenderingContext2D, points: readonly PointCenter[], radius: number): void {
    if (!points.length) {
      return;
    }

    context.beginPath();
    points.forEach((point) => {
      context.moveTo(point.x + radius, point.y);
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    });
    context.fill();
  }

  private toPointCenter(tile: TilePosition): PointCenter {
    return {
      x: tile.x * this.world.tileSize + this.world.tileSize / 2,
      y: tile.y * this.world.tileSize + this.world.tileSize / 2,
    };
  }

  private drawEntities(): void {
    const pacmanSheet = this.assets.getSpriteSheet('pacman');
    if (pacmanSheet) {
      this.renderer.drawSpriteFrame(
        pacmanSheet,
        0,
        this.world.pacman.x,
        this.world.pacman.y,
        this.world.pacman.displayWidth,
        this.world.pacman.displayHeight,
        (this.world.pacman.angle * Math.PI) / 180,
        this.world.pacman.flipX,
        this.world.pacman.flipY,
      );
    }

    this.world.ghosts.forEach((ghost) => {
      const sheetKey = ghost.state.scared ? 'scared' : ghost.key;
      const sheet = this.assets.getSpriteSheet(sheetKey);
      if (!sheet) {
        return;
      }

      const frame = this.world.ghostAnimations.get(ghost)?.frame ?? 0;
      this.renderer.drawSpriteFrame(
        sheet,
        frame,
        ghost.x,
        ghost.y,
        ghost.displayWidth,
        ghost.displayHeight,
        (ghost.angle * Math.PI) / 180,
        ghost.flipX,
        ghost.flipY,
      );
    });
  }
}
