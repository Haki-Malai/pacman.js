import { AssetCatalog } from '../infrastructure/assets/AssetCatalog';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { WorldState } from '../domain/world/WorldState';
import { Camera2D } from '../../engine/camera';

const BACKGROUND_COLOR = '#2d2d2d';

export class RenderSystem {
  constructor(
    private readonly world: WorldState,
    private readonly renderer: CanvasRendererAdapter,
    private readonly camera: Camera2D,
    private readonly assets: AssetCatalog,
  ) {}

  render(): void {
    this.renderer.clear(BACKGROUND_COLOR);
    this.renderer.beginWorld(this.camera);
    this.drawMap();
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
