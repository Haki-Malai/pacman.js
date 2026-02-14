import Phaser from 'phaser';
import { applyBufferedDirection, canMove as canMoveHelper, getAvailableDirections as getAvailableDirectionsHelper } from '../movement';
import {
  CAMERA,
  GHOST_JAIL_MOVE_SPEED,
  GHOST_JAIL_RELEASE_DELAY_MS,
  GHOST_JAIL_RELEASE_TWEEN_MS,
  INITIAL_LIVES,
  SPEED,
  SPRITE_SIZE,
  TILE_SIZE,
} from '../config/constants';
import {
  CollisionTile,
  CollisionTiles,
  Direction,
  GhostKey,
  GhostSprite,
  MovableEntity,
  MovementActor,
  MovementProgress,
  PacmanSprite,
  TilePosition,
} from '../types';
import { resetGameState } from '../state/gameState';

type OrientedTile = Phaser.Tilemaps.Tile & { propertiesOriented?: CollisionTile };
type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

const GHOST_KEYS: GhostKey[] = ['inky', 'clyde', 'pinky', 'blinky'];

type DebugTileInfo = {
  x: number;
  y: number;
  gid: number | null;
  localId: number | null;
  imagePath: string;
  collides: boolean;
  penGate: boolean;
  portal: boolean;
  up: boolean;
  right: boolean;
  down: boolean;
  left: boolean;
  rotationDegrees: number;
  flipX: boolean;
  flipY: boolean;
};

const createEmptyCollisionTile = (): CollisionTile => ({
  collides: false,
  penGate: false,
  portal: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export default class GameScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private pacman!: PacmanSprite;
  private ghostGroup!: Phaser.Physics.Arcade.Group;
  private ghosts: GhostSprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: MovementKeys;
  private tileSize: number = TILE_SIZE;
  private collisionGrid: CollisionTile[][] = [];
  private collisionPropertiesByGid: Map<number, CollisionTile> = new Map();
  private collisionImageByGid: Map<number, string> = new Map();
  private scaredKeyListenerAttached = false;
  private isMoving = true;
  private collisionDebugEnabled = false;
  private collisionDebugGraphics?: Phaser.GameObjects.Graphics;
  private collisionDebugInfoPanel?: HTMLPreElement;
  private hoveredDebugTile: TilePosition | null = null;
  private ghostReleaseTimers: Phaser.Time.TimerEvent[] = [];
  private ghostsExitingJail = new Set<GhostSprite>();
  private ghostJailMinX = 0;
  private ghostJailMaxX = 0;
  private ghostJailY = 0;

  private toggleGhostFear = (): void => {
    this.ghosts.forEach((ghost) => {
      ghost.state.scared = !ghost.state.scared;
    });
  };

  private setPaused(paused: boolean): void {
    this.isMoving = !paused;
    this.ghostReleaseTimers.forEach((timer) => {
      timer.paused = paused;
    });
    if (paused) {
      this.physics.world.pause();
      this.anims.pauseAll();
      this.tweens.pauseAll();
      return;
    }
    this.physics.world.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();
  }

  private togglePause = (): void => {
    this.setPaused(this.isMoving);
  };

  private handleCollisionDebugHotkey = (event: KeyboardEvent): void => {
    if (event.shiftKey) {
      event.preventDefault();
      void this.copyVisibleCollisionDebugInfo();
      return;
    }
    this.toggleCollisionDebug();
  };

  private toggleCollisionDebug = (): void => {
    this.collisionDebugEnabled = !this.collisionDebugEnabled;
    if (!this.collisionDebugGraphics) {
      return;
    }
    this.collisionDebugGraphics.visible = this.collisionDebugEnabled;
    if (this.collisionDebugInfoPanel) {
      this.collisionDebugInfoPanel.style.display = this.collisionDebugEnabled ? 'block' : 'none';
    }
    if (!this.collisionDebugEnabled) {
      this.collisionDebugGraphics.clear();
      if (this.collisionDebugInfoPanel) {
        this.collisionDebugInfoPanel.textContent = '';
      }
      this.hoveredDebugTile = null;
    }
  };

  constructor() {
    super({ key: 'Game' });
  }

  private get tileCenterOffset(): number {
    return this.tileSize / 2;
  }

  private readCollisionTileFromProps(props: Record<string, unknown>): CollisionTile {
    const read = (key: string) => props[key];
    const toBool = (value: unknown) => Boolean(value);

    return {
      collides: toBool(read('collides')),
      penGate: toBool(read('penGate')),
      portal: toBool(read('portal')),
      up: toBool(read('up') ?? read('blocksUp')),
      down: toBool(read('down') ?? read('blocksDown')),
      left: toBool(read('left') ?? read('blocksLeft')),
      right: toBool(read('right') ?? read('blocksRight')),
    };
  }

  private buildCollisionPropertiesLookup(): void {
    this.collisionPropertiesByGid.clear();
    this.collisionImageByGid.clear();

    const cacheEntry = this.cache.tilemap.get('maze') as { data?: unknown } | undefined;
    const mapData = cacheEntry?.data;
    if (!isRecord(mapData)) {
      return;
    }

    const rawTilesets = mapData.tilesets;
    if (!Array.isArray(rawTilesets)) {
      return;
    }

    rawTilesets.forEach((rawTileset) => {
      if (!isRecord(rawTileset)) {
        return;
      }

      const firstgid = rawTileset.firstgid;
      const tiles = rawTileset.tiles;
      if (typeof firstgid !== 'number' || !Array.isArray(tiles)) {
        return;
      }

      tiles.forEach((rawTile) => {
        if (!isRecord(rawTile)) {
          return;
        }

        const tileId = rawTile.id;
        if (typeof tileId !== 'number') {
          return;
        }

        const imagePath = rawTile.image;
        if (typeof imagePath === 'string') {
          const gid = firstgid + tileId;
          this.collisionImageByGid.set(gid, imagePath);
        }

        const propertyRecord: Record<string, unknown> = {};
        const properties = rawTile.properties;
        if (Array.isArray(properties)) {
          properties.forEach((rawProperty) => {
            if (!isRecord(rawProperty)) {
              return;
            }

            const name = rawProperty.name;
            if (typeof name !== 'string') {
              return;
            }

            propertyRecord[name] = rawProperty.value;
          });
        }

        const gid = firstgid + tileId;
        this.collisionPropertiesByGid.set(gid, this.readCollisionTileFromProps(propertyRecord));
      });
    });
  }

  private updateHoveredDebugTile(pointer: Phaser.Input.Pointer): void {
    if (!this.collisionDebugEnabled) {
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = this.map.worldToTileX(worldPoint.x);
    const tileY = this.map.worldToTileY(worldPoint.y);
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      this.hoveredDebugTile = null;
      return;
    }
    this.hoveredDebugTile = { x: tileX, y: tileY };
  }

  private getDebugTileInfo(tilePosition: TilePosition): DebugTileInfo {
    const { x, y } = tilePosition;
    const tile = this.wallsLayer.getTileAt(x, y) as OrientedTile | null;
    const collision = this.getCollisionTileAt(x, y);

    if (!tile || tile.index < 0) {
      return {
        x,
        y,
        gid: null,
        localId: null,
        imagePath: '(empty)',
        collides: collision.collides,
        penGate: collision.penGate,
        portal: collision.portal,
        up: collision.up,
        right: collision.right,
        down: collision.down,
        left: collision.left,
        rotationDegrees: 0,
        flipX: false,
        flipY: false,
      };
    }

    const localId = tile.tileset ? tile.index - tile.tileset.firstgid : tile.index;
    const rotationSteps = ((Math.round((tile.rotation ?? 0) / (Math.PI / 2)) % 4) + 4) % 4;

    return {
      x,
      y,
      gid: tile.index,
      localId,
      imagePath: this.collisionImageByGid.get(tile.index) ?? '(unknown)',
      collides: collision.collides,
      penGate: collision.penGate,
      portal: collision.portal,
      up: collision.up,
      right: collision.right,
      down: collision.down,
      left: collision.left,
      rotationDegrees: rotationSteps * 90,
      flipX: tile.flipX,
      flipY: tile.flipY,
    };
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall back to textarea copy if Clipboard API is unavailable or blocked.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }

  private async copyVisibleCollisionDebugInfo(): Promise<void> {
    const visibleText = this.collisionDebugInfoPanel?.textContent;
    if (!visibleText || visibleText.length === 0) {
      return;
    }

    const copied = await this.copyTextToClipboard(visibleText);
    if (!copied) {
      this.setCollisionDebugInfo(`${visibleText}\ncopy failed (browser blocked clipboard access)`);
    }
  }

  private getTileDebugInfo(tilePosition: TilePosition): string {
    const info = this.getDebugTileInfo(tilePosition);
    if (info.gid === null) {
      return [
        'Collision Debug',
        `tile: (${info.x}, ${info.y})`,
        'gid: empty',
        'edges: up:false right:false down:false left:false',
      ].join('\n');
    }

    return [
      'Collision Debug',
      `tile: (${info.x}, ${info.y}) gid:${info.gid} local:${info.localId}`,
      `image: ${info.imagePath}`,
      `collides:${info.collides} penGate:${info.penGate} portal:${info.portal}`,
      `edges: up:${info.up} right:${info.right} down:${info.down} left:${info.left}`,
      `transform: rot:${info.rotationDegrees}deg flipX:${info.flipX} flipY:${info.flipY}`,
    ].join('\n');
  }

  private getTileProperties(tile?: OrientedTile | null): CollisionTile {
    if (!tile || tile.index < 0) {
      return createEmptyCollisionTile();
    }

    if (tile.propertiesOriented) {
      return { ...tile.propertiesOriented };
    }

    const fromLookup = this.collisionPropertiesByGid.get(tile.index);
    if (fromLookup) {
      return { ...fromLookup };
    }

    const rawProps = isRecord(tile.properties) ? tile.properties : {};
    return this.readCollisionTileFromProps(rawProps);
  }

  private prepareCollisionLayer(): void {
    const normalize = (tile?: Phaser.Tilemaps.Tile): CollisionTile => {
      if (!tile || tile.index < 0) {
        return createEmptyCollisionTile();
      }

      const fromLookup = this.collisionPropertiesByGid.get(tile.index);
      if (fromLookup) {
        return { ...fromLookup };
      }

      const rawProps = isRecord(tile.properties) ? tile.properties : {};
      return this.readCollisionTileFromProps(rawProps);
    };

    const orient = (base: CollisionTile, tile: Phaser.Tilemaps.Tile): CollisionTile => {
      let edges = {
        up: base.up,
        right: base.right,
        down: base.down,
        left: base.left,
      };

      // Phaser composes tile transforms with flips in local space before rotation.
      // Match that order so collision edges follow the rendered tile orientation.
      if (tile.flipX) {
        [edges.left, edges.right] = [edges.right, edges.left];
      }
      if (tile.flipY) {
        [edges.up, edges.down] = [edges.down, edges.up];
      }

      const rotationSteps = ((Math.round((tile.rotation ?? 0) / (Math.PI / 2)) % 4) + 4) % 4;
      for (let i = 0; i < rotationSteps; i++) {
        edges = {
          up: edges.left,
          right: edges.up,
          down: edges.right,
          left: edges.down,
        };
      }
      return {
        collides: base.collides,
        penGate: base.penGate,
        portal: base.portal,
        ...edges,
      };
    };

    this.wallsLayer.forEachTile((tile) => {
      const orientedTile = tile as OrientedTile;
      const base = normalize(orientedTile);
      orientedTile.propertiesOriented = orient(base, orientedTile);
    });

    this.collisionGrid =
      this.wallsLayer.layer?.data.map((row) =>
        row.map((tile) => {
          const orientedTile = (tile as OrientedTile | null) ?? null;
          if (!orientedTile) {
            return createEmptyCollisionTile();
          }
          return this.getTileProperties(orientedTile);
        }),
      ) ?? [];
  }

  private getCollisionTileAt(tileX: number, tileY: number): CollisionTile {
    const row = this.collisionGrid[tileY];
    if (!row) {
      return createEmptyCollisionTile();
    }
    return row[tileX] ?? createEmptyCollisionTile();
  }

  private getCollisionTilesFor(entity: MovableEntity): CollisionTiles {
    const { x: tileX, y: tileY } = entity.tile;
    return this.getCollisionTilesAt({ x: tileX, y: tileY });
  }

  private getCollisionTilesAt(tile: TilePosition): CollisionTiles {
    const { x: tileX, y: tileY } = tile;
    return {
      current: this.getCollisionTileAt(tileX, tileY),
      up: this.getCollisionTileAt(tileX, tileY - 1),
      down: this.getCollisionTileAt(tileX, tileY + 1),
      left: this.getCollisionTileAt(tileX - 1, tileY),
      right: this.getCollisionTileAt(tileX + 1, tileY),
    };
  }

  private canGhostMoveFromTile(tile: TilePosition): boolean {
    const collisionTiles = this.getCollisionTilesAt(tile);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    return directions.some((direction) => this.canMove(direction, 0, 0, collisionTiles, this.tileSize, 'ghost'));
  }

  private findGhostReleaseTile(currentTile: TilePosition, avoidTile: TilePosition): TilePosition {
    const releaseY = Phaser.Math.Clamp(this.ghostJailY - 1, 0, this.map.height - 1);
    const candidates: TilePosition[] = [];
    for (let x = this.ghostJailMinX; x <= this.ghostJailMaxX; x++) {
      const tile = { x, y: releaseY };
      if (tile.x === avoidTile.x && tile.y === avoidTile.y) {
        continue;
      }
      if (this.canGhostMoveFromTile(tile)) {
        candidates.push(tile);
      }
    }

    const fallback = this.clampTilePosition({ x: currentTile.x, y: releaseY });
    if (!candidates.length) {
      return fallback;
    }

    const pickRandom = (options: TilePosition[]): TilePosition => {
      if (!options.length) {
        return fallback;
      }
      const index = Math.floor(Math.random() * options.length);
      return options[index] ?? fallback;
    };

    const currentX = Phaser.Math.Clamp(currentTile.x, this.ghostJailMinX, this.ghostJailMaxX);
    const nearby = candidates.filter((candidate) => Math.abs(candidate.x - currentX) <= 1);
    if (nearby.length) {
      return pickRandom(nearby);
    }

    let nearestDistance = Number.POSITIVE_INFINITY;
    candidates.forEach((candidate) => {
      nearestDistance = Math.min(nearestDistance, Math.abs(candidate.x - currentX));
    });
    const nearestCandidates = candidates.filter((candidate) => Math.abs(candidate.x - currentX) === nearestDistance);
    return pickRandom(nearestCandidates);
  }

  private moveGhostInJail(ghost: GhostSprite): void {
    if (ghost.tile.y !== this.ghostJailY || ghost.moved.y !== 0) {
      this.setEntityTile(ghost, { x: ghost.tile.x, y: this.ghostJailY });
    }

    if (ghost.moved.x === 0) {
      if (ghost.direction !== 'left' && ghost.direction !== 'right') {
        ghost.direction = Math.random() < 0.5 ? 'right' : 'left';
      }
      if (ghost.tile.x <= this.ghostJailMinX && ghost.direction === 'left') {
        ghost.direction = 'right';
      } else if (ghost.tile.x >= this.ghostJailMaxX && ghost.direction === 'right') {
        ghost.direction = 'left';
      }
    }

    this.advanceEntity(ghost, ghost.direction, GHOST_JAIL_MOVE_SPEED);
    if (ghost.tile.x < this.ghostJailMinX || ghost.tile.x > this.ghostJailMaxX) {
      const clampedX = Phaser.Math.Clamp(ghost.tile.x, this.ghostJailMinX, this.ghostJailMaxX);
      this.setEntityTile(ghost, { x: clampedX, y: this.ghostJailY });
      ghost.direction = ghost.direction === 'left' ? 'right' : 'left';
    }
  }

  private canMove(
    direction: Direction,
    movedY: number,
    movedX: number,
    collisionTiles: CollisionTiles,
    tileSize: number = this.tileSize,
    actor: MovementActor = 'pacman',
  ): boolean {
    return canMoveHelper(direction, movedY, movedX, collisionTiles, tileSize, actor);
  }

  private advanceEntity(entity: PacmanSprite | GhostSprite, direction: Direction, speed = 1): void {
    const delta = DIRECTION_VECTORS[direction];
    entity.moved.x += delta.dx * speed;
    entity.moved.y += delta.dy * speed;

    while (entity.moved.x >= this.tileSize) {
      entity.tile.x += 1;
      entity.moved.x -= this.tileSize;
    }
    while (entity.moved.x <= -this.tileSize) {
      entity.tile.x -= 1;
      entity.moved.x += this.tileSize;
    }
    while (entity.moved.y >= this.tileSize) {
      entity.tile.y += 1;
      entity.moved.y -= this.tileSize;
    }
    while (entity.moved.y <= -this.tileSize) {
      entity.tile.y -= 1;
      entity.moved.y += this.tileSize;
    }

    this.syncEntityPosition(entity);
  }

  private getAvailableDirections(
    collisionTiles: CollisionTiles,
    currentDirection: Direction,
    actor: MovementActor,
  ): Direction[] {
    return getAvailableDirectionsHelper(collisionTiles, currentDirection, this.tileSize, actor);
  }

  private syncEntityPosition(entity: PacmanSprite | GhostSprite): void {
    const position = this.toWorldPosition(entity.tile, entity.moved);
    entity.setPosition(position.x, position.y);
  }

  private setEntityTile(entity: PacmanSprite | GhostSprite, tile: TilePosition): void {
    entity.tile = { ...tile };
    entity.moved = { x: 0, y: 0 };
    this.syncEntityPosition(entity);
  }

  private getObjectNumberProperty(
    obj: Phaser.Types.Tilemaps.TiledObject | undefined,
    name: string,
  ): number | undefined {
    if (!obj?.properties) {
      return undefined;
    }
    const properties = obj.properties as Array<{ name: string; value: unknown }>;
    const property = properties.find((prop) => prop.name === name);
    return typeof property?.value === 'number' ? property.value : undefined;
  }

  private getObjectTilePosition(
    obj: Phaser.Types.Tilemaps.TiledObject | undefined,
    fallback: TilePosition,
  ): TilePosition {
    const gridX = this.getObjectNumberProperty(obj, 'gridX');
    const gridY = this.getObjectNumberProperty(obj, 'gridY');
    if (typeof gridX === 'number' && typeof gridY === 'number') {
      return { x: gridX, y: gridY };
    }
    if (obj && typeof obj.x === 'number' && typeof obj.y === 'number') {
      return {
        x: this.map.worldToTileX(obj.x),
        y: this.map.worldToTileY(obj.y),
      };
    }
    return fallback;
  }

  private clampTilePosition(tile: TilePosition): TilePosition {
    return {
      x: Phaser.Math.Clamp(tile.x, 0, this.map.width - 1),
      y: Phaser.Math.Clamp(tile.y, 0, this.map.height - 1),
    };
  }

  private isTilePassable(tile: TilePosition): boolean {
    const clamped = this.clampTilePosition(tile);
    return !this.getCollisionTileAt(clamped.x, clamped.y).collides;
  }

  private findNearestPassableTile(preferred: TilePosition): TilePosition {
    const center = this.clampTilePosition(preferred);
    if (this.isTilePassable(center)) {
      return center;
    }

    const maxRadius = Math.max(this.map.width, this.map.height);
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        if (y < 0 || y >= this.map.height) {
          continue;
        }
        for (let x = center.x - radius; x <= center.x + radius; x++) {
          if (x < 0 || x >= this.map.width) {
            continue;
          }
          const tile = { x, y };
          if (this.isTilePassable(tile)) {
            return tile;
          }
        }
      }
    }

    return center;
  }

  private resolveSpawnTile(
    objectTile: Phaser.Types.Tilemaps.TiledObject | undefined,
    fallback: TilePosition,
  ): TilePosition {
    return this.clampTilePosition(this.getObjectTilePosition(objectTile, fallback));
  }

  private toWorldPosition(tile: TilePosition, moved: MovementProgress): { x: number; y: number } {
    const x = this.map.tileToWorldX(tile.x) + this.tileCenterOffset + moved.x;
    const y = this.map.tileToWorldY(tile.y) + this.tileCenterOffset + moved.y;
    return { x, y };
  }

  private registerKeyboardShortcuts(): void {
    if (this.scaredKeyListenerAttached) {
      return;
    }
    this.scaredKeyListenerAttached = true;
    this.input.keyboard.on('keydown-H', this.toggleGhostFear, this);
    this.input.keyboard.on('keydown-C', this.handleCollisionDebugHotkey, this);
    this.input.keyboard.on('keydown-SPACE', this.togglePause, this);

    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      this.input.keyboard.off('keydown-H', this.toggleGhostFear, this);
      this.input.keyboard.off('keydown-C', this.handleCollisionDebugHotkey, this);
      this.input.keyboard.off('keydown-SPACE', this.togglePause, this);
      this.scaredKeyListenerAttached = false;
    });
  }

  private drawDebugMarker(tile: TilePosition, color: number): void {
    if (!this.collisionDebugGraphics || !this.collisionDebugEnabled) {
      return;
    }

    const x = this.map.tileToWorldX(tile.x);
    const y = this.map.tileToWorldY(tile.y);
    this.collisionDebugGraphics.lineStyle(1, color, 1);
    this.collisionDebugGraphics.strokeRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2);
  }

  private setCollisionDebugInfo(text: string): void {
    if (!this.collisionDebugInfoPanel) {
      return;
    }
    this.collisionDebugInfoPanel.textContent = text;
  }

  private drawCollisionDebugOverlay(): void {
    if (!this.collisionDebugGraphics) {
      return;
    }

    const graphics = this.collisionDebugGraphics;
    graphics.clear();

    if (!this.collisionDebugEnabled) {
      this.setCollisionDebugInfo('');
      return;
    }

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.getCollisionTileAt(x, y);
        if (!tile.collides && !tile.up && !tile.down && !tile.left && !tile.right && !tile.penGate) {
          continue;
        }

        const worldX = this.map.tileToWorldX(x);
        const worldY = this.map.tileToWorldY(y);
        const edgeColor = tile.penGate ? 0x00ffff : 0xff3355;

        const isFullBlock = tile.up && tile.right && tile.down && tile.left;
        if (isFullBlock) {
          graphics.fillStyle(0xff3355, 0.06);
          graphics.fillRect(worldX, worldY, this.tileSize, this.tileSize);
        }

        graphics.lineStyle(1, edgeColor, 0.95);
        if (tile.up) {
          graphics.beginPath();
          graphics.moveTo(worldX, worldY);
          graphics.lineTo(worldX + this.tileSize, worldY);
          graphics.strokePath();
        }
        if (tile.down) {
          graphics.beginPath();
          graphics.moveTo(worldX, worldY + this.tileSize);
          graphics.lineTo(worldX + this.tileSize, worldY + this.tileSize);
          graphics.strokePath();
        }
        if (tile.left) {
          graphics.beginPath();
          graphics.moveTo(worldX, worldY);
          graphics.lineTo(worldX, worldY + this.tileSize);
          graphics.strokePath();
        }
        if (tile.right) {
          graphics.beginPath();
          graphics.moveTo(worldX + this.tileSize, worldY);
          graphics.lineTo(worldX + this.tileSize, worldY + this.tileSize);
          graphics.strokePath();
        }
      }
    }

    this.drawDebugMarker(this.pacman.tile, 0xffdd00);
    this.ghosts.forEach((ghost) => {
      this.drawDebugMarker(ghost.tile, 0x00ff66);
    });

    if (this.hoveredDebugTile) {
      this.drawDebugMarker(this.hoveredDebugTile, 0x33ccff);
      this.setCollisionDebugInfo(this.getTileDebugInfo(this.hoveredDebugTile));
    } else {
      this.setCollisionDebugInfo('Collision Debug\nmove mouse over a block to inspect');
    }
  }

  create(): void {
    const pacmanSize = SPRITE_SIZE.pacman;
    const ghostSize = SPRITE_SIZE.ghost;

    this.ghosts = [];
    this.scaredKeyListenerAttached = false;
    this.collisionDebugEnabled = false;
    this.isMoving = true;
    this.ghostReleaseTimers = [];
    this.ghostsExitingJail.clear();
    resetGameState(0, INITIAL_LIVES);

    this.map = this.make.tilemap({ key: 'maze' });
    this.tileSize = this.map.tileWidth || TILE_SIZE;
    this.buildCollisionPropertiesLookup();

    const layerName = this.map.getLayer('Maze')?.name ?? this.map.layers[0]?.name;
    if (!layerName) {
      throw new Error('Maze layer is required in maze.json');
    }

    const tilesets = this.map.tilesets
      .map((tileset) =>
        this.map.addTilesetImage(
          tileset.name,
          tileset.name,
          tileset.tileWidth,
          tileset.tileHeight,
          tileset.tileMargin,
          tileset.tileSpacing,
          tileset.firstgid,
        ),
      )
      .filter((tileset): tileset is Phaser.Tilemaps.Tileset => Boolean(tileset));

    if (!tilesets.length) {
      throw new Error('No tilesets could be bound for maze.json');
    }

    const layer = this.map.createLayer(layerName, tilesets, 0, 0);
    if (!layer) {
      throw new Error(`Failed to create map layer: ${layerName}`);
    }

    this.wallsLayer = layer.setDepth(1);
    this.prepareCollisionLayer();

    const spawnLayer = this.map.getObjectLayer('Spawns');
    const spawnObjects = spawnLayer?.objects ?? [];
    const pacmanSpawn = spawnObjects.find((obj) => obj.type === 'pacman');
    const ghostHome = spawnObjects.find((obj) => obj.type === 'ghost-home');

    const centerTile: TilePosition = {
      x: Math.floor(this.map.width / 2),
      y: Math.floor(this.map.height / 2),
    };
    const fallbackSpawn = centerTile;
    const pacmanTile = this.resolveSpawnTile(pacmanSpawn, fallbackSpawn);

    const ghostStartXRaw = this.getObjectNumberProperty(ghostHome, 'startX') ?? pacmanTile.x;
    const ghostEndXRaw = this.getObjectNumberProperty(ghostHome, 'endX') ?? pacmanTile.x;
    const ghostMinX = Phaser.Math.Clamp(Math.round(Math.min(ghostStartXRaw, ghostEndXRaw)), 0, this.map.width - 1);
    const ghostMaxX = Phaser.Math.Clamp(Math.round(Math.max(ghostStartXRaw, ghostEndXRaw)), 0, this.map.width - 1);

    const ghostGridY = this.getObjectNumberProperty(ghostHome, 'gridY');
    const ghostYRaw =
      typeof ghostGridY === 'number'
        ? ghostGridY
        : ghostHome && typeof ghostHome.y === 'number'
          ? Math.round(ghostHome.y / this.map.tileHeight)
          : pacmanTile.y;
    const ghostY = Phaser.Math.Clamp(ghostYRaw, 0, this.map.height - 1);

    const ghostCountRaw = this.getObjectNumberProperty(ghostHome, 'ghostCount') ?? 4;
    const ghostCount = Math.max(0, Math.round(ghostCountRaw));
    this.ghostJailMinX = ghostMinX;
    this.ghostJailMaxX = ghostMaxX;
    this.ghostJailY = ghostY;

    const pacmanSpawnPosition = this.toWorldPosition(pacmanTile, { x: 0, y: 0 });
    this.pacman = this.physics.add.sprite(pacmanSpawnPosition.x, pacmanSpawnPosition.y, 'pacman').setDepth(2) as PacmanSprite;
    this.pacman.displayWidth = pacmanSize;
    this.pacman.displayHeight = pacmanSize;
    this.pacman.direction = {
      next: 'right',
      current: 'right',
    };
    this.setEntityTile(this.pacman, pacmanTile);

    this.anims.create({
      key: 'scaredIdle',
      frames: this.anims.generateFrameNames('scared', { start: 0, end: 7 }),
      yoyo: true,
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'inkyIdle',
      frames: this.anims.generateFrameNames('inky', { start: 0, end: 7 }),
      yoyo: true,
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'clydeIdle',
      frames: this.anims.generateFrameNames('clyde', { start: 0, end: 7 }),
      yoyo: true,
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'pinkyIdle',
      frames: this.anims.generateFrameNames('pinky', { start: 0, end: 7 }),
      yoyo: true,
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'blinkyIdle',
      frames: this.anims.generateFrameNames('blinky', { start: 0, end: 7 }),
      yoyo: true,
      frameRate: 4,
      repeat: -1,
    });

    this.ghostGroup = this.physics.add.group();
    for (let i = 0; i < ghostCount; i++) {
      const range = ghostMaxX - ghostMinX + 1;
      const randomSpawnX = ghostMinX + Math.floor(Math.random() * Math.max(range, 1));
      const spawnCandidate: TilePosition = { x: randomSpawnX, y: ghostY };
      const spawnTile = this.clampTilePosition(spawnCandidate);

      const ghostKey = GHOST_KEYS[i % GHOST_KEYS.length];
      const spawnWorld = this.toWorldPosition(spawnTile, { x: 0, y: 0 });
      const ghost = this.ghostGroup.create(spawnWorld.x, spawnWorld.y, ghostKey) as GhostSprite;
      ghost.displayWidth = ghostSize;
      ghost.displayHeight = ghostSize;
      this.setEntityTile(ghost, spawnTile);
      ghost.key = ghostKey;
      ghost.state = {
        free: false,
        soonFree: true,
        scared: false,
        dead: false,
        animation: 'default',
      };
      ghost.speed = SPEED.ghost;
      ghost.play(`${ghostKey}Idle`);
      ghost.direction = Math.random() < 0.5 ? 'right' : 'left';
      this.ghosts.push(ghost);

      const releaseTimer = this.time.delayedCall(GHOST_JAIL_RELEASE_DELAY_MS, () => {
        if (!ghost.active) {
          return;
        }
        const jailTile = this.clampTilePosition({ x: ghost.tile.x, y: this.ghostJailY });
        const currentPacmanTile = this.clampTilePosition(this.pacman.tile);
        const releaseTile = this.findGhostReleaseTile(jailTile, currentPacmanTile);
        this.ghostsExitingJail.add(ghost);
        const releaseWorld = this.toWorldPosition(releaseTile, { x: 0, y: 0 });
        this.tweens.add({
          targets: ghost,
          x: releaseWorld.x,
          y: releaseWorld.y,
          duration: GHOST_JAIL_RELEASE_TWEEN_MS,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!ghost.active) {
              this.ghostsExitingJail.delete(ghost);
              return;
            }
            this.ghostsExitingJail.delete(ghost);
            this.setEntityTile(ghost, releaseTile);
            ghost.state.free = true;
            ghost.state.soonFree = false;
          },
        });
      });
      this.ghostReleaseTimers.push(releaseTimer);
    }

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    camera.zoomTo(CAMERA.zoom);
    camera.startFollow(this.pacman, true, CAMERA.followLerp.x, CAMERA.followLerp.y);

    this.cursors = this.input.keyboard.createCursorKeys();
    const wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
    this.wasdKeys = wasd;
    this.registerKeyboardShortcuts();

    this.collisionDebugGraphics = this.add.graphics().setDepth(10);
    this.collisionDebugGraphics.visible = this.collisionDebugEnabled;
    const panelId = 'collision-debug-panel';
    document.getElementById(panelId)?.remove();
    this.collisionDebugInfoPanel = document.createElement('pre');
    this.collisionDebugInfoPanel.id = panelId;
    this.collisionDebugInfoPanel.style.position = 'fixed';
    this.collisionDebugInfoPanel.style.left = '8px';
    this.collisionDebugInfoPanel.style.top = '52px';
    this.collisionDebugInfoPanel.style.margin = '0';
    this.collisionDebugInfoPanel.style.padding = '6px 8px';
    this.collisionDebugInfoPanel.style.color = '#ffffff';
    this.collisionDebugInfoPanel.style.background = 'rgba(0, 0, 0, 0.78)';
    this.collisionDebugInfoPanel.style.font = '12px/1.35 monospace';
    this.collisionDebugInfoPanel.style.whiteSpace = 'pre';
    this.collisionDebugInfoPanel.style.pointerEvents = 'none';
    this.collisionDebugInfoPanel.style.zIndex = '9999';
    this.collisionDebugInfoPanel.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.collisionDebugInfoPanel.style.borderRadius = '4px';
    this.collisionDebugInfoPanel.style.display = this.collisionDebugEnabled ? 'block' : 'none';
    document.body.appendChild(this.collisionDebugInfoPanel);

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      this.updateHoveredDebugTile(pointer);
    };
    const toggleMovement = (pointer: Phaser.Input.Pointer) => {
      this.updateHoveredDebugTile(pointer);
      this.togglePause();
    };
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerdown', toggleMovement);
    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      this.input.off('pointermove', onPointerMove);
      this.input.off('pointerdown', toggleMovement);
      this.collisionDebugGraphics?.destroy();
      this.collisionDebugGraphics = undefined;
      this.collisionDebugInfoPanel?.remove();
      this.collisionDebugInfoPanel = undefined;
      this.ghostReleaseTimers = [];
      this.ghostsExitingJail.clear();
    });
  }

  update(): void {
    if (!this.isMoving) {
      this.drawCollisionDebugOverlay();
      return;
    }

    this.ghosts.forEach((ghost) => {
      if (ghost.state.scared && ghost.state.animation !== 'scared') {
        ghost.play('scaredIdle');
        ghost.state.animation = 'scared';
        ghost.speed = 0.5;
      } else if (ghost.state.animation === 'scared' && !ghost.state.scared) {
        ghost.play(`${ghost.key}Idle`);
        ghost.state.animation = 'default';
        ghost.speed = 1;
      }

      if (!ghost.state.free) {
        if (!this.ghostsExitingJail.has(ghost)) {
          this.moveGhostInJail(ghost);
        }
        return;
      }

      const collisionTiles = this.getCollisionTilesFor(ghost);
      const canMoveCurrent = this.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost');
      if (canMoveCurrent) {
        if (ghost.moved.y === 0 && ghost.moved.x === 0) {
          const options = this.getAvailableDirections(collisionTiles, ghost.direction, 'ghost');
          if (options.length) {
            ghost.direction = options[Math.floor(Math.random() * options.length)];
          }
        }
        this.advanceEntity(ghost, ghost.direction, ghost.speed);
      } else if (ghost.moved.y === 0 && ghost.moved.x === 0) {
        const perpendicular: Direction[] =
          ghost.direction === 'right' || ghost.direction === 'left' ? ['up', 'down'] : ['right', 'left'];
        const options = perpendicular.filter((direction) =>
          this.canMove(direction, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost'),
        );
        if (options.length) {
          ghost.direction = options[Math.floor(Math.random() * options.length)];
        } else {
          const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
          const fallback = opposites[ghost.direction];
          if (fallback && this.canMove(fallback, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost')) {
            ghost.direction = fallback;
          }
        }
      }
    });

    if (this.pacman.direction.current === 'right') {
      this.pacman.angle = 0;
      if (this.pacman.flipY) this.pacman.flipY = false;
    } else if (this.pacman.direction.current === 'left' && this.pacman.angle !== -180) {
      this.pacman.angle = 180;
      if (!this.pacman.flipY) this.pacman.flipY = true;
    }
    if (this.pacman.direction.current === 'up' && this.pacman.angle !== -90) {
      this.pacman.angle = -90;
    } else if (this.pacman.direction.current === 'down' && this.pacman.angle !== 90) {
      this.pacman.angle = 90;
    }

    const leftPressed = Boolean(this.cursors.left?.isDown || this.wasdKeys?.left.isDown);
    const rightPressed = Boolean(this.cursors.right?.isDown || this.wasdKeys?.right.isDown);
    const upPressed = Boolean(this.cursors.up?.isDown || this.wasdKeys?.up.isDown);
    const downPressed = Boolean(this.cursors.down?.isDown || this.wasdKeys?.down.isDown);

    if (leftPressed) {
      this.pacman.direction.next = 'left';
    } else if (rightPressed) {
      this.pacman.direction.next = 'right';
    } else if (upPressed) {
      this.pacman.direction.next = 'up';
    } else if (downPressed) {
      this.pacman.direction.next = 'down';
    }

    const collisionTiles = this.getCollisionTilesFor(this.pacman);

    applyBufferedDirection(this.pacman, collisionTiles, this.tileSize, (direction, movedY, movedX, tiles, tileSize, actor) =>
      this.canMove(direction, movedY, movedX, tiles, tileSize, actor),
    );

    if (this.isMoving && this.canMove(this.pacman.direction.current, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
      this.advanceEntity(this.pacman, this.pacman.direction.current, SPEED.pacman);
    }

    this.drawCollisionDebugOverlay();
  }
}
