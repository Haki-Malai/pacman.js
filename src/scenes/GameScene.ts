import Phaser from 'phaser';
import { applyBufferedDirection, canMove as canMoveHelper, getAvailableDirections as getAvailableDirectionsHelper } from '../movement';
import { CAMERA, INITIAL_LIVES, SPEED, SPRITE_SIZE, TILE_SIZE } from '../config/constants';
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

const GHOST_KEYS: GhostKey[] = ['inky', 'clyde', 'pinky', 'blinky'];

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
  private tileSize: number = TILE_SIZE;
  private collisionGrid: CollisionTile[][] = [];
  private collisionPropertiesByGid: Map<number, CollisionTile> = new Map();
  private scaredKeyListenerAttached = false;
  private isMoving = true;
  private collisionDebugEnabled = false;
  private collisionDebugGraphics?: Phaser.GameObjects.Graphics;

  private toggleGhostFear = (): void => {
    this.ghosts.forEach((ghost) => {
      ghost.state.scared = !ghost.state.scared;
    });
  };

  private toggleCollisionDebug = (): void => {
    this.collisionDebugEnabled = !this.collisionDebugEnabled;
    if (!this.collisionDebugGraphics) {
      return;
    }
    this.collisionDebugGraphics.visible = this.collisionDebugEnabled;
    if (!this.collisionDebugEnabled) {
      this.collisionDebugGraphics.clear();
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
      const rotationSteps = ((Math.round((tile.rotation ?? 0) / (Math.PI / 2)) % 4) + 4) % 4;
      for (let i = 0; i < rotationSteps; i++) {
        edges = {
          up: edges.left,
          right: edges.up,
          down: edges.right,
          left: edges.down,
        };
      }
      if (tile.flipX) {
        [edges.left, edges.right] = [edges.right, edges.left];
      }
      if (tile.flipY) {
        [edges.up, edges.down] = [edges.down, edges.up];
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
    return {
      current: this.getCollisionTileAt(tileX, tileY),
      up: this.getCollisionTileAt(tileX, tileY - 1),
      down: this.getCollisionTileAt(tileX, tileY + 1),
      left: this.getCollisionTileAt(tileX - 1, tileY),
      right: this.getCollisionTileAt(tileX + 1, tileY),
    };
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
    const preferred = this.clampTilePosition(this.getObjectTilePosition(objectTile, fallback));
    if (this.isTilePassable(preferred)) {
      return preferred;
    }
    return this.findNearestPassableTile(preferred);
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
    this.input.keyboard.on('keydown-C', this.toggleCollisionDebug, this);

    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      this.input.keyboard.off('keydown-H', this.toggleGhostFear, this);
      this.input.keyboard.off('keydown-C', this.toggleCollisionDebug, this);
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

  private drawCollisionDebugOverlay(): void {
    if (!this.collisionDebugGraphics) {
      return;
    }

    const graphics = this.collisionDebugGraphics;
    graphics.clear();

    if (!this.collisionDebugEnabled) {
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

        if (tile.collides) {
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
  }

  create(): void {
    const pacmanSize = SPRITE_SIZE.pacman;
    const ghostSize = SPRITE_SIZE.ghost;

    this.ghosts = [];
    this.scaredKeyListenerAttached = false;
    this.collisionDebugEnabled = false;
    this.isMoving = true;
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
    const fallbackSpawn = this.findNearestPassableTile(centerTile);
    const pacmanTile = this.resolveSpawnTile(pacmanSpawn, fallbackSpawn);

    const ghostStartXRaw = this.getObjectNumberProperty(ghostHome, 'startX') ?? pacmanTile.x;
    const ghostEndXRaw = this.getObjectNumberProperty(ghostHome, 'endX') ?? pacmanTile.x;
    const ghostMinX = Phaser.Math.Clamp(Math.round(Math.min(ghostStartXRaw, ghostEndXRaw)), 0, this.map.width - 1);
    const ghostMaxX = Phaser.Math.Clamp(Math.round(Math.max(ghostStartXRaw, ghostEndXRaw)), 0, this.map.width - 1);

    const ghostYRaw =
      ghostHome && typeof ghostHome.y === 'number' ? Math.round(ghostHome.y / this.map.tileHeight) : pacmanTile.y;
    const ghostY = Phaser.Math.Clamp(ghostYRaw, 0, this.map.height - 1);

    const ghostCountRaw = this.getObjectNumberProperty(ghostHome, 'ghostCount') ?? 4;
    const ghostCount = Math.max(0, Math.round(ghostCountRaw));

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
      const spawnTile = this.isTilePassable(spawnCandidate)
        ? spawnCandidate
        : this.findNearestPassableTile(spawnCandidate);

      const ghostKey = GHOST_KEYS[i % GHOST_KEYS.length];
      const spawnWorld = this.toWorldPosition(spawnTile, { x: 0, y: 0 });
      const ghost = this.ghostGroup.create(spawnWorld.x, spawnWorld.y, ghostKey) as GhostSprite;
      ghost.displayWidth = ghostSize;
      ghost.displayHeight = ghostSize;
      this.setEntityTile(ghost, spawnTile);
      ghost.key = ghostKey;
      ghost.state = {
        free: true,
        soonFree: false,
        scared: false,
        dead: false,
        animation: 'default',
      };
      ghost.speed = SPEED.ghost;
      ghost.play(`${ghostKey}Idle`);
      ghost.direction = Math.random() < 0.5 ? 'right' : 'left';
      this.ghosts.push(ghost);
    }

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    camera.zoomTo(CAMERA.zoom);
    camera.startFollow(this.pacman, true, CAMERA.followLerp.x, CAMERA.followLerp.y);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.registerKeyboardShortcuts();

    this.collisionDebugGraphics = this.add.graphics().setDepth(10);
    this.collisionDebugGraphics.visible = this.collisionDebugEnabled;

    const toggleMovement = () => {
      this.isMoving = !this.isMoving;
    };
    this.input.on('pointerdown', toggleMovement);
    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      this.input.off('pointerdown', toggleMovement);
      this.collisionDebugGraphics?.destroy();
      this.collisionDebugGraphics = undefined;
    });
  }

  update(): void {
    this.ghosts.forEach((ghost) => {
      if (this.isMoving && !ghost.state.free && !ghost.state.soonFree) {
        ghost.state.soonFree = true;
        setTimeout(() => {
          ghost.state.free = true;
          ghost.state.soonFree = false;
        }, 5000);
      }

      if (ghost.state.scared && ghost.state.animation !== 'scared') {
        ghost.play('scaredIdle');
        ghost.state.animation = 'scared';
        ghost.speed = 0.5;
      } else if (ghost.state.animation === 'scared' && !ghost.state.scared) {
        ghost.play(`${ghost.key}Idle`);
        ghost.state.animation = 'default';
        ghost.speed = 1;
      }

      const collisionTiles = this.getCollisionTilesFor(ghost);
      const canMoveCurrent = this.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost');
      if (ghost.state.free) {
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
      } else {
        if (!canMoveCurrent && ghost.moved.y === 0 && ghost.moved.x === 0) {
          ghost.direction = ghost.direction === 'right' ? 'left' : 'right';
        }
        if (this.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost')) {
          this.advanceEntity(ghost, ghost.direction, ghost.speed);
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

    if (this.cursors.left?.isDown) {
      this.pacman.direction.next = 'left';
    } else if (this.cursors.right?.isDown) {
      this.pacman.direction.next = 'right';
    } else if (this.cursors.up?.isDown) {
      this.pacman.direction.next = 'up';
    } else if (this.cursors.down?.isDown) {
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
