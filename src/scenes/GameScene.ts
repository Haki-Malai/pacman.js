import Phaser from 'phaser';
import { applyBufferedDirection, canMove as canMoveHelper, getAvailableDirections as getAvailableDirectionsHelper } from '../movement';
import { CAMERA, COLLECTIBLE_CONFIG, INITIAL_LIVES, SPEED, SPRITE_SIZE, TILE_SIZE } from '../config/constants';
import {
  CollisionTile,
  CollisionTiles,
  Direction,
  GhostKey,
  GhostSprite,
  MovableEntity,
  PacmanSprite,
  MovementProgress,
  TilePosition,
} from '../types';
import { addScore, resetGameState } from '../state/gameState';

type Collectible = {
  tile: TilePosition;
  pointType: number;
  sprite: Phaser.Physics.Arcade.Sprite;
};

type CollectibleConfig = {
  texture: string;
  size: number;
  score: number;
};

type OrientedTile = Phaser.Tilemaps.Tile & { propertiesOriented?: CollisionTile };

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

export default class GameScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private tiles!: Phaser.Tilemaps.Tileset;
  private floorLayer!: Phaser.Tilemaps.TilemapLayer;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private points!: Phaser.Physics.Arcade.Group;
  private pacman!: PacmanSprite;
  private ghostGroup!: Phaser.Physics.Arcade.Group;
  private ghosts: GhostSprite[] = [];
  private collectibles: Map<string, Collectible> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private tileSize: number = TILE_SIZE;
  private collisionGrid: CollisionTile[][] = [];
  private scaredKeyListenerAttached = false;
  private isMoving = true;

  private toggleGhostFear = (): void => {
    this.ghosts.forEach((ghost) => {
      ghost.state.scared = !ghost.state.scared;
    });
  };

  constructor() {
    super({ key: 'Game' });
  }

  private get tileCenterOffset(): number {
    return this.tileSize / 2;
  }

  private getScoreIncrement(pointType: number): number {
    const config = this.getCollectibleConfig(pointType);
    return config?.score ?? 0;
  }

  private getTileProperties(tile?: OrientedTile | null): CollisionTile {
    const props = (tile?.propertiesOriented ?? tile?.properties ?? {}) as Record<string, unknown>;
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

  private prepareCollisionLayer(): void {
    const normalize = (tile?: Phaser.Tilemaps.Tile): CollisionTile => {
      const props = (tile?.properties ?? {}) as Record<string, unknown>;
      return {
        collides: Boolean(props.collides),
        penGate: Boolean(props.penGate),
        portal: Boolean(props.portal),
        up: Boolean(props.blocksUp ?? props.up),
        down: Boolean(props.blocksDown ?? props.down),
        left: Boolean(props.blocksLeft ?? props.left),
        right: Boolean(props.blocksRight ?? props.right),
      };
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

  private getCollectibleConfig(pointType: number): CollectibleConfig | null {
    const config = COLLECTIBLE_CONFIG[pointType];
    if (!config) {
      return null;
    }
    return { ...config };
  }

  private removeCollectible(sprite: Phaser.Physics.Arcade.Sprite): Collectible | undefined {
    const tileKey: unknown = sprite.getData('tileKey');
    if (typeof tileKey !== 'string') {
      return undefined;
    }
    const collectible = this.collectibles.get(tileKey);
    this.collectibles.delete(tileKey);
    sprite.destroy();
    return collectible;
  }

  private canMove(
    direction: Direction,
    movedY: number,
    movedX: number,
    collisionTiles: CollisionTiles,
    tileSize: number = this.tileSize,
  ): boolean {
    return canMoveHelper(direction, movedY, movedX, collisionTiles, tileSize);
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

  private getAvailableDirections(collisionTiles: CollisionTiles, currentDirection: Direction): Direction[] {
    return getAvailableDirectionsHelper(collisionTiles, currentDirection, this.tileSize);
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

  private toWorldPosition(tile: TilePosition, moved: MovementProgress): { x: number; y: number } {
    const x = this.map.tileToWorldX(tile.x) + this.tileCenterOffset + moved.x;
    const y = this.map.tileToWorldY(tile.y) + this.tileCenterOffset + moved.y;
    return { x, y };
  }

  private getTileKey(tile: TilePosition): string {
    return `${tile.x},${tile.y}`;
  }

  private registerKeyboardShortcuts(): void {
    if (this.scaredKeyListenerAttached) {
      return;
    }
    this.scaredKeyListenerAttached = true;
    this.input.keyboard.on('keydown-H', this.toggleGhostFear, this);
    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      this.input.keyboard.off('keydown-H', this.toggleGhostFear, this);
      this.scaredKeyListenerAttached = false;
    });
  }

  private awardCollectible(sprite: Phaser.Physics.Arcade.Sprite): void {
    const collectible = this.removeCollectible(sprite);
    if (!collectible) {
      return;
    }
    addScore(this.getScoreIncrement(collectible.pointType));
  }

  create(): void {
    const pacmanSize = SPRITE_SIZE.pacman;
    const ghostSize = SPRITE_SIZE.ghost;

    this.collectibles.clear();
    this.ghosts = [];
    this.scaredKeyListenerAttached = false;
    resetGameState(0, INITIAL_LIVES);

    this.map = this.make.tilemap({ key: 'maze' });
    this.tileSize = this.map.tileWidth || TILE_SIZE;
    this.tiles = this.map.addTilesetImage('tileset', 'tiles', this.tileSize, this.tileSize);
    this.floorLayer = this.map.createLayer('Floor', this.tiles, 0, 0).setDepth(0);
    this.wallsLayer = this.map.createLayer('Walls', this.tiles, 0, 0).setDepth(1);
    this.prepareCollisionLayer();

    const spawnLayer = this.map.getObjectLayer('Spawns');
    const dotLayer = this.map.getObjectLayer('Dots');
    const spawnObjects = spawnLayer?.objects ?? [];
    const pacmanSpawn = spawnObjects.find((obj) => obj.type === 'pacman');
    const ghostHome = spawnObjects.find((obj) => obj.type === 'ghost-home');
    const pacmanTile = this.getObjectTilePosition(pacmanSpawn, { x: 25, y: 26 });
    const ghostStartX = this.getObjectNumberProperty(ghostHome, 'startX') ?? 0;
    const ghostEndX = this.getObjectNumberProperty(ghostHome, 'endX') ?? 0;
    const ghostY =
      ghostHome && typeof ghostHome.y === 'number'
        ? Math.round(ghostHome.y / this.map.tileHeight)
        : 0;
    const ghostCount = this.getObjectNumberProperty(ghostHome, 'ghostCount') ?? 8;

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
      key: 'eat',
      frames: this.anims.generateFrameNames('pacman', { start: 0, end: 3 }),
      yoyo: true,
      frameRate: 16,
    });

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
    const divideBy4 = ghostCount / 4;
    for (let i = 0; i < ghostCount; i++) {
      const randomIntegerTemp = Math.floor(Math.random() * (ghostEndX - ghostStartX)) + ghostStartX;
      let ghostKey: GhostKey;
      if (i < divideBy4) {
        ghostKey = 'inky';
      } else if (i < divideBy4 * 2) {
        ghostKey = 'clyde';
      } else if (i < divideBy4 * 3) {
        ghostKey = 'pinky';
      } else {
        ghostKey = 'blinky';
      }
      const spawnTile: TilePosition = { x: randomIntegerTemp, y: ghostY };
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

    this.points = this.physics.add.group();
    const dotObjects = dotLayer?.objects ?? [];
    dotObjects.forEach((dot) => {
      const pointType = this.getObjectNumberProperty(dot, 'pointType') ?? 0;
      const tile = this.getObjectTilePosition(dot, { x: 0, y: 0 });
      const config = this.getCollectibleConfig(pointType);
      if (!config) {
        return;
      }
      const worldPosition = this.toWorldPosition(tile, { x: 0, y: 0 });
      const point = this.points.create(worldPosition.x, worldPosition.y, config.texture) as Phaser.Physics.Arcade.Sprite;
      point.displayHeight = config.size;
      point.displayWidth = config.size;
      point.setOrigin(0.5);
      const key = this.getTileKey(tile);
      point.setData('tileKey', key);
      this.collectibles.set(key, { pointType, tile, sprite: point });
    });

    const eatPoint: ArcadePhysicsCallback = (_pacman, point) => {
      const sprite = point as Phaser.Physics.Arcade.Sprite;
      this.awardCollectible(sprite);
      this.pacman.play('eat');
    };

    this.physics.add.overlap(this.pacman, this.points, eatPoint, undefined, this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    camera.zoomTo(CAMERA.zoom);
    camera.startFollow(this.pacman, true, CAMERA.followLerp.x, CAMERA.followLerp.y);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.registerKeyboardShortcuts();
    const toggleMovement = () => {
      this.isMoving = !this.isMoving;
    };
    this.input.on('pointerdown', toggleMovement);
    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      this.input.off('pointerdown', toggleMovement);
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
      const canMoveCurrent = this.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles);
      if (ghost.state.free) {
        if (canMoveCurrent) {
          if (ghost.moved.y === 0 && ghost.moved.x === 0) {
            const options = this.getAvailableDirections(collisionTiles, ghost.direction);
            if (options.length) {
              ghost.direction = options[Math.floor(Math.random() * options.length)];
            }
          }
          this.advanceEntity(ghost, ghost.direction, ghost.speed);
        } else if (ghost.moved.y === 0 && ghost.moved.x === 0) {
          const perpendicular: Direction[] =
            ghost.direction === 'right' || ghost.direction === 'left' ? ['up', 'down'] : ['right', 'left'];
          const options = perpendicular.filter((direction) =>
            this.canMove(direction, ghost.moved.y, ghost.moved.x, collisionTiles),
          );
          if (options.length) {
            ghost.direction = options[Math.floor(Math.random() * options.length)];
          } else {
            const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
            const fallback = opposites[ghost.direction];
            if (fallback && this.canMove(fallback, ghost.moved.y, ghost.moved.x, collisionTiles)) {
              ghost.direction = fallback;
            }
          }
        }
      } else {
        if (!canMoveCurrent && ghost.moved.y === 0 && ghost.moved.x === 0) {
          ghost.direction = ghost.direction === 'right' ? 'left' : 'right';
        }
        if (this.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles)) {
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

    applyBufferedDirection(
      this.pacman,
      collisionTiles,
      this.tileSize,
      (direction, movedY, movedX, tiles) => this.canMove(direction, movedY, movedX, tiles),
    );

    if (!this.isMoving) {
      return;
    }

    if (this.canMove(this.pacman.direction.current, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
      this.advanceEntity(this.pacman, this.pacman.direction.current, SPEED.pacman);
    }
  }
}
