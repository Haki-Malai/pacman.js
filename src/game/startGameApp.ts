import { AssetStore, SpriteSheetAsset } from '../engine/assets';
import { Camera2D } from '../engine/camera';
import { InputManager, PointerState } from '../engine/input';
import { FixedStepLoop } from '../engine/loop';
import { clamp } from '../engine/math';
import { CanvasRenderer } from '../engine/renderer';
import { TimerHandle, TimerManager } from '../engine/timer';
import { TweenManager } from '../engine/tween';
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
import { createEmptyCollisionTile, getObjectNumberProperty, parseTiledMap, ParsedMazeTile, ParsedTiledMap, TiledMap } from './map/tiled';
import { HudOverlay } from './ui/HudOverlay';

const SPRITE_SHEET_FRAME_WIDTH = 85;
const SPRITE_SHEET_FRAME_HEIGHT = 91;

const SPRITESHEET_SOURCES = {
  pacman: '/assets/sprites/PacMan.png',
  blinky: '/assets/sprites/Blinky.png',
  clyde: '/assets/sprites/Clyde.png',
  pinky: '/assets/sprites/Pinky.png',
  inky: '/assets/sprites/Inky.png',
  scared: '/assets/sprites/Scared.png',
} as const;

type AnimationKey = 'scaredIdle' | 'inkyIdle' | 'clydeIdle' | 'pinkyIdle' | 'blinkyIdle';

type AnimationDefinition = {
  start: number;
  end: number;
  yoyo: boolean;
  frameRate: number;
};

type AnimationPlayback = {
  key: AnimationKey;
  frame: number;
  elapsedMs: number;
  forward: 1 | -1;
};

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

const GHOST_KEYS: GhostKey[] = ['inky', 'clyde', 'pinky', 'blinky'];

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const ANIMATIONS: Record<AnimationKey, AnimationDefinition> = {
  scaredIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  inkyIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  clydeIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  pinkyIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
  blinkyIdle: { start: 0, end: 7, yoyo: true, frameRate: 4 },
};

export interface StartGameAppOptions {
  mountId?: string;
  rng?: () => number;
}

export function createSeededRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class GameApp {
  private readonly mount: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: CanvasRenderer;
  private readonly camera = new Camera2D();
  private readonly assets = new AssetStore();
  private readonly input: InputManager;
  private readonly timers = new TimerManager();
  private readonly tweens = new TweenManager();
  private readonly loop: FixedStepLoop;
  private readonly rng: () => number;

  private map!: ParsedTiledMap;
  private tileSize = TILE_SIZE;
  private collisionGrid: CollisionTile[][] = [];
  private tileImageCache = new Map<string, HTMLImageElement>();
  private spritesheets = new Map<string, SpriteSheetAsset>();

  private pacman!: PacmanSprite;
  private ghosts: GhostSprite[] = [];
  private ghostReleaseTimers: TimerHandle[] = [];
  private ghostsExitingJail = new Set<GhostSprite>();
  private ghostAnimations = new Map<GhostSprite, AnimationPlayback>();

  private ghostJailMinX = 0;
  private ghostJailMaxX = 0;
  private ghostJailY = 0;

  private isMoving = true;
  private collisionDebugEnabled = false;
  private hoveredDebugTile: TilePosition | null = null;
  private collisionDebugInfoPanel?: HTMLPreElement;
  private hudOverlay?: HudOverlay;

  private disposers: Array<() => void> = [];
  private destroyed = false;

  constructor(options: StartGameAppOptions) {
    const mountId = options.mountId ?? 'game-root';
    const mount = document.getElementById(mountId);
    if (!mount) {
      throw new Error(`Game mount element not found: #${mountId}`);
    }

    this.mount = mount;
    this.mount.replaceChildren();

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.touchAction = 'none';
    this.mount.appendChild(this.canvas);

    this.renderer = new CanvasRenderer(this.canvas);
    this.input = new InputManager(this.canvas);
    this.rng = options.rng ?? Math.random;

    this.loop = new FixedStepLoop(this.update, this.render);
  }

  async start(): Promise<void> {
    const mapData = await this.assets.loadJSON<TiledMap>('maze', '/assets/mazes/default/maze.json');
    this.map = parseTiledMap(mapData);
    this.tileSize = this.map.tileWidth || TILE_SIZE;

    await this.loadAssets();

    this.hudOverlay = new HudOverlay();
    this.createCollisionDebugPanel();
    this.initializeWorld();
    this.registerInputHandlers();
    this.registerResizeHandler();
    this.handleResize();

    this.loop.start();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.loop.stop();
    this.timers.clear();
    this.tweens.clear();
    this.input.destroy();

    this.disposers.forEach((dispose) => {
      dispose();
    });
    this.disposers = [];

    this.collisionDebugInfoPanel?.remove();
    this.collisionDebugInfoPanel = undefined;
    this.hudOverlay?.destroy();
    this.hudOverlay = undefined;
    this.mount.replaceChildren();
  }

  private async loadAssets(): Promise<void> {
    const uniqueTileImages = new Set<string>();
    this.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (tile.imagePath !== '(empty)' && tile.imagePath !== '(unknown)') {
          uniqueTileImages.add(tile.imagePath);
        }
      });
    });

    const imagePromises: Array<Promise<unknown>> = [];
    uniqueTileImages.forEach((imagePath) => {
      imagePromises.push(this.assets.loadImage(imagePath, `/assets/mazes/default/${imagePath}`));
    });

    Object.entries(SPRITESHEET_SOURCES).forEach(([key, src]) => {
      imagePromises.push(this.assets.loadSpriteSheet(key, src, SPRITE_SHEET_FRAME_WIDTH, SPRITE_SHEET_FRAME_HEIGHT));
    });

    await Promise.all(imagePromises);

    uniqueTileImages.forEach((imagePath) => {
      this.tileImageCache.set(imagePath, this.assets.getImage(imagePath));
    });

    Object.keys(SPRITESHEET_SOURCES).forEach((key) => {
      this.spritesheets.set(key, this.assets.getSpriteSheet(key));
    });
  }

  private initializeWorld(): void {
    this.ghosts = [];
    this.ghostReleaseTimers = [];
    this.ghostsExitingJail.clear();
    this.ghostAnimations.clear();
    this.isMoving = true;
    this.collisionDebugEnabled = false;
    this.hoveredDebugTile = null;
    this.collisionDebugInfoPanel!.style.display = 'none';
    this.collisionDebugInfoPanel!.textContent = '';

    this.collisionGrid = this.map.tiles.map((row) => row.map((tile) => ({ ...tile.collision })));

    resetGameState(0, INITIAL_LIVES);

    const centerTile: TilePosition = {
      x: Math.floor(this.map.width / 2),
      y: Math.floor(this.map.height / 2),
    };

    const pacmanTile = this.resolveSpawnTile(this.map.pacmanSpawn, centerTile);

    const ghostStartXRaw = getObjectNumberProperty(this.map.ghostHome, 'startX') ?? pacmanTile.x;
    const ghostEndXRaw = getObjectNumberProperty(this.map.ghostHome, 'endX') ?? pacmanTile.x;
    this.ghostJailMinX = clamp(Math.round(Math.min(ghostStartXRaw, ghostEndXRaw)), 0, this.map.width - 1);
    this.ghostJailMaxX = clamp(Math.round(Math.max(ghostStartXRaw, ghostEndXRaw)), 0, this.map.width - 1);

    const ghostGridY = getObjectNumberProperty(this.map.ghostHome, 'gridY');
    const ghostYRaw =
      typeof ghostGridY === 'number'
        ? ghostGridY
        : this.map.ghostHome && typeof this.map.ghostHome.y === 'number'
          ? Math.round(this.map.ghostHome.y / this.map.tileHeight)
          : pacmanTile.y;
    this.ghostJailY = clamp(ghostYRaw, 0, this.map.height - 1);

    const ghostCountRaw = getObjectNumberProperty(this.map.ghostHome, 'ghostCount') ?? 4;
    const ghostCount = Math.max(0, Math.round(ghostCountRaw));

    this.pacman = {
      x: 0,
      y: 0,
      displayWidth: SPRITE_SIZE.pacman,
      displayHeight: SPRITE_SIZE.pacman,
      angle: 0,
      flipX: false,
      flipY: false,
      depth: 2,
      active: true,
      moved: { x: 0, y: 0 },
      direction: { current: 'right', next: 'right' },
      tile: { ...pacmanTile },
    };
    this.setEntityTile(this.pacman, pacmanTile);

    for (let i = 0; i < ghostCount; i += 1) {
      const range = this.ghostJailMaxX - this.ghostJailMinX + 1;
      const randomSpawnX = this.ghostJailMinX + this.randomInt(Math.max(1, range));
      const spawnTile = this.clampTilePosition({ x: randomSpawnX, y: this.ghostJailY });

      const ghostKey = GHOST_KEYS[i % GHOST_KEYS.length];
      const ghost: GhostSprite = {
        x: 0,
        y: 0,
        displayWidth: SPRITE_SIZE.ghost,
        displayHeight: SPRITE_SIZE.ghost,
        angle: 0,
        flipX: false,
        flipY: false,
        depth: 2,
        active: true,
        moved: { x: 0, y: 0 },
        key: ghostKey,
        state: {
          free: false,
          soonFree: true,
          scared: false,
          dead: false,
          animation: 'default',
        },
        direction: this.rng() < 0.5 ? 'right' : 'left',
        speed: SPEED.ghost,
        tile: { ...spawnTile },
      };

      this.setEntityTile(ghost, spawnTile);
      this.ghosts.push(ghost);
      this.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));

      const releaseTimer = this.timers.delayedCall(GHOST_JAIL_RELEASE_DELAY_MS, () => {
        if (!ghost.active) {
          return;
        }

        const jailTile = this.clampTilePosition({ x: ghost.tile.x, y: this.ghostJailY });
        const currentPacmanTile = this.clampTilePosition(this.pacman.tile);
        const releaseTile = this.findGhostReleaseTile(jailTile, currentPacmanTile);
        const releaseWorld = this.toWorldPosition(releaseTile, { x: 0, y: 0 });

        this.ghostsExitingJail.add(ghost);

        this.tweens.add({
          target: ghost,
          to: {
            x: releaseWorld.x,
            y: releaseWorld.y,
          },
          durationMs: GHOST_JAIL_RELEASE_TWEEN_MS,
          ease: 'sineInOut',
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

    this.camera.setBounds(this.map.widthInPixels, this.map.heightInPixels);
    this.camera.setZoom(CAMERA.zoom);
    this.camera.startFollow(this.pacman, CAMERA.followLerp.x, CAMERA.followLerp.y);
  }

  private registerInputHandlers(): void {
    this.disposers.push(
      this.input.onKeyDown((event) => {
        this.handleKeyDown(event);
      }),
    );

    this.disposers.push(
      this.input.onPointerMove((pointer) => {
        this.handlePointerMove(pointer);
      }),
    );

    this.disposers.push(
      this.input.onPointerDown((pointer) => {
        this.handlePointerDown(pointer);
      }),
    );
  }

  private registerResizeHandler(): void {
    const onResize = () => {
      this.handleResize();
    };

    window.addEventListener('resize', onResize);
    this.disposers.push(() => {
      window.removeEventListener('resize', onResize);
    });
  }

  private createCollisionDebugPanel(): void {
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
    this.collisionDebugInfoPanel.style.display = 'none';

    document.body.appendChild(this.collisionDebugInfoPanel);
  }

  private handleResize(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.camera.setViewport(this.canvas.width, this.canvas.height);
  }

  private readonly update = (deltaMs: number): void => {
    if (this.destroyed) {
      return;
    }

    if (!this.isMoving) {
      return;
    }

    this.timers.update(deltaMs);
    this.tweens.update(deltaMs);

    this.ghosts.forEach((ghost) => {
      this.updateGhostAnimationState(ghost, deltaMs);

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
          if (options.length > 0) {
            ghost.direction = options[this.randomInt(options.length)] ?? ghost.direction;
          }
        }
        this.advanceEntity(ghost, ghost.direction, ghost.speed);
        return;
      }

      if (ghost.moved.y === 0 && ghost.moved.x === 0) {
        const perpendicular: Direction[] =
          ghost.direction === 'right' || ghost.direction === 'left' ? ['up', 'down'] : ['right', 'left'];

        const options = perpendicular.filter((direction) =>
          this.canMove(direction, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost'),
        );

        if (options.length > 0) {
          ghost.direction = options[this.randomInt(options.length)] ?? ghost.direction;
          return;
        }

        const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const fallback = opposites[ghost.direction];
        if (this.canMove(fallback, ghost.moved.y, ghost.moved.x, collisionTiles, this.tileSize, 'ghost')) {
          ghost.direction = fallback;
        }
      }
    });

    this.updatePacmanDirectionVisuals();
    this.updatePacmanBufferedDirection();

    const collisionTiles = this.getCollisionTilesFor(this.pacman);
    if (this.canMove(this.pacman.direction.current, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
      this.advanceEntity(this.pacman, this.pacman.direction.current, SPEED.pacman);
    }

    this.camera.update();
  };

  private readonly render = (): void => {
    if (this.destroyed) {
      return;
    }

    this.renderer.clear('#2d2d2d');
    this.renderer.beginWorld(this.camera);
    this.drawMap();
    this.drawEntities();
    this.drawCollisionDebugOverlay();
    this.renderer.endWorld();
    this.refreshCollisionDebugPanel();
  };

  private drawMap(): void {
    this.map.tiles.forEach((row) => {
      row.forEach((tile) => {
        if (tile.gid === null || tile.imagePath === '(empty)' || tile.imagePath === '(unknown)') {
          return;
        }

        const image = this.tileImageCache.get(tile.imagePath);
        if (!image) {
          return;
        }

        const x = this.tileToWorldX(tile.x) + this.tileCenterOffset;
        const y = this.tileToWorldY(tile.y) + this.tileCenterOffset;

        this.renderer.drawImageCentered(image, x, y, this.tileSize, this.tileSize, tile.rotation, tile.flipX, tile.flipY);
      });
    });
  }

  private drawEntities(): void {
    const pacmanSheet = this.spritesheets.get('pacman');
    if (pacmanSheet) {
      this.renderer.drawSpriteFrame(
        pacmanSheet,
        0,
        this.pacman.x,
        this.pacman.y,
        this.pacman.displayWidth,
        this.pacman.displayHeight,
        (this.pacman.angle * Math.PI) / 180,
        this.pacman.flipX,
        this.pacman.flipY,
      );
    }

    this.ghosts.forEach((ghost) => {
      const sheetKey = ghost.state.scared ? 'scared' : ghost.key;
      const sheet = this.spritesheets.get(sheetKey);
      if (!sheet) {
        return;
      }

      const playback = this.ghostAnimations.get(ghost);
      const frame = playback?.frame ?? 0;

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

  private updateGhostAnimationState(ghost: GhostSprite, deltaMs: number): void {
    if (ghost.state.scared && ghost.state.animation !== 'scared') {
      ghost.state.animation = 'scared';
      ghost.speed = 0.5;
      this.ghostAnimations.set(ghost, this.createAnimationPlayback('scaredIdle'));
    } else if (!ghost.state.scared && ghost.state.animation === 'scared') {
      ghost.state.animation = 'default';
      ghost.speed = 1;
      this.ghostAnimations.set(ghost, this.createAnimationPlayback(`${ghost.key}Idle` as AnimationKey));
    }

    const playback = this.ghostAnimations.get(ghost);
    if (!playback) {
      return;
    }

    const definition = ANIMATIONS[playback.key];
    const frameDuration = 1000 / definition.frameRate;
    playback.elapsedMs += deltaMs;

    while (playback.elapsedMs >= frameDuration) {
      playback.elapsedMs -= frameDuration;

      if (!definition.yoyo) {
        playback.frame = playback.frame + 1 > definition.end ? definition.start : playback.frame + 1;
        continue;
      }

      if (playback.forward === 1) {
        if (playback.frame < definition.end) {
          playback.frame += 1;
        } else {
          playback.forward = -1;
          playback.frame -= 1;
        }
      } else if (playback.frame > definition.start) {
        playback.frame -= 1;
      } else {
        playback.forward = 1;
        playback.frame += 1;
      }
    }
  }

  private createAnimationPlayback(key: AnimationKey): AnimationPlayback {
    const definition = ANIMATIONS[key];
    return {
      key,
      frame: definition.start,
      elapsedMs: 0,
      forward: 1,
    };
  }

  private updatePacmanDirectionVisuals(): void {
    if (this.pacman.direction.current === 'right') {
      this.pacman.angle = 0;
      this.pacman.flipY = false;
      return;
    }

    if (this.pacman.direction.current === 'left') {
      this.pacman.angle = 180;
      this.pacman.flipY = true;
      return;
    }

    if (this.pacman.direction.current === 'up') {
      this.pacman.angle = -90;
      return;
    }

    if (this.pacman.direction.current === 'down') {
      this.pacman.angle = 90;
    }
  }

  private updatePacmanBufferedDirection(): void {
    const leftPressed = this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA');
    const rightPressed = this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD');
    const upPressed = this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW');
    const downPressed = this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS');

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
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    if (event.code === 'KeyH') {
      this.toggleGhostFear();
      return;
    }

    if (event.code === 'KeyC') {
      if (event.shiftKey) {
        event.preventDefault();
        void this.copyVisibleCollisionDebugInfo();
        return;
      }
      this.toggleCollisionDebug();
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePause();
    }
  }

  private handlePointerMove(pointer: PointerState): void {
    this.updateHoveredDebugTile(pointer.x, pointer.y);
  }

  private handlePointerDown(pointer: PointerState): void {
    this.updateHoveredDebugTile(pointer.x, pointer.y);
    this.togglePause();
  }

  private toggleGhostFear(): void {
    this.ghosts.forEach((ghost) => {
      ghost.state.scared = !ghost.state.scared;
    });
  }

  private setPaused(paused: boolean): void {
    this.isMoving = !paused;
    this.ghostReleaseTimers.forEach((timer) => {
      timer.paused = paused;
    });
    this.timers.setPaused(paused);
    this.tweens.setPaused(paused);
  }

  private togglePause(): void {
    this.setPaused(this.isMoving);
  }

  private toggleCollisionDebug(): void {
    this.collisionDebugEnabled = !this.collisionDebugEnabled;
    if (!this.collisionDebugInfoPanel) {
      return;
    }

    this.collisionDebugInfoPanel.style.display = this.collisionDebugEnabled ? 'block' : 'none';
    if (!this.collisionDebugEnabled) {
      this.collisionDebugInfoPanel.textContent = '';
      this.hoveredDebugTile = null;
    }
  }

  private updateHoveredDebugTile(screenX: number, screenY: number): void {
    if (!this.collisionDebugEnabled) {
      return;
    }

    const worldPoint = this.camera.screenToWorld(screenX, screenY);
    const tileX = this.worldToTileX(worldPoint.x);
    const tileY = this.worldToTileY(worldPoint.y);

    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      this.hoveredDebugTile = null;
      return;
    }

    this.hoveredDebugTile = { x: tileX, y: tileY };
  }

  private drawCollisionDebugOverlay(): void {
    if (!this.collisionDebugEnabled) {
      return;
    }

    const ctx = this.renderer.context;

    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        const tile = this.getCollisionTileAt(x, y);
        if (!tile.collides && !tile.up && !tile.down && !tile.left && !tile.right && !tile.penGate) {
          continue;
        }

        const worldX = this.tileToWorldX(x);
        const worldY = this.tileToWorldY(y);

        if (tile.up && tile.right && tile.down && tile.left) {
          ctx.fillStyle = 'rgba(255, 51, 85, 0.06)';
          ctx.fillRect(worldX, worldY, this.tileSize, this.tileSize);
        }

        ctx.strokeStyle = tile.penGate ? '#00ffff' : '#ff3355';
        ctx.lineWidth = 1;

        if (tile.up) {
          ctx.beginPath();
          ctx.moveTo(worldX, worldY);
          ctx.lineTo(worldX + this.tileSize, worldY);
          ctx.stroke();
        }

        if (tile.down) {
          ctx.beginPath();
          ctx.moveTo(worldX, worldY + this.tileSize);
          ctx.lineTo(worldX + this.tileSize, worldY + this.tileSize);
          ctx.stroke();
        }

        if (tile.left) {
          ctx.beginPath();
          ctx.moveTo(worldX, worldY);
          ctx.lineTo(worldX, worldY + this.tileSize);
          ctx.stroke();
        }

        if (tile.right) {
          ctx.beginPath();
          ctx.moveTo(worldX + this.tileSize, worldY);
          ctx.lineTo(worldX + this.tileSize, worldY + this.tileSize);
          ctx.stroke();
        }
      }
    }

    this.drawDebugMarker(this.pacman.tile, '#ffdd00');
    this.ghosts.forEach((ghost) => {
      this.drawDebugMarker(ghost.tile, '#00ff66');
    });

    if (this.hoveredDebugTile) {
      this.drawDebugMarker(this.hoveredDebugTile, '#33ccff');
    }
  }

  private drawDebugMarker(tile: TilePosition, color: string): void {
    const ctx = this.renderer.context;
    const x = this.tileToWorldX(tile.x);
    const y = this.tileToWorldY(tile.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2);
  }

  private refreshCollisionDebugPanel(): void {
    if (!this.collisionDebugInfoPanel) {
      return;
    }

    if (!this.collisionDebugEnabled) {
      this.collisionDebugInfoPanel.textContent = '';
      return;
    }

    if (!this.hoveredDebugTile) {
      this.collisionDebugInfoPanel.textContent = 'Collision Debug\nmove mouse over a block to inspect';
      return;
    }

    this.collisionDebugInfoPanel.textContent = this.getTileDebugInfo(this.hoveredDebugTile);
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

  private getDebugTileInfo(tilePosition: TilePosition): DebugTileInfo {
    const tile = this.map.tiles[tilePosition.y]?.[tilePosition.x] as ParsedMazeTile | undefined;
    const collision = this.getCollisionTileAt(tilePosition.x, tilePosition.y);

    if (!tile || tile.gid === null) {
      return {
        x: tilePosition.x,
        y: tilePosition.y,
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

    const rotationSteps = ((Math.round(tile.rotation / (Math.PI / 2)) % 4) + 4) % 4;

    return {
      x: tilePosition.x,
      y: tilePosition.y,
      gid: tile.gid,
      localId: tile.localId,
      imagePath: tile.imagePath,
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

  private async copyVisibleCollisionDebugInfo(): Promise<void> {
    const visibleText = this.collisionDebugInfoPanel?.textContent;
    if (!visibleText || visibleText.length === 0) {
      return;
    }

    const copied = await this.copyTextToClipboard(visibleText);
    if (!copied) {
      this.collisionDebugInfoPanel!.textContent = `${visibleText}\ncopy failed (browser blocked clipboard access)`;
    }
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Ignore clipboard API errors and try fallback copy method.
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

  private getCollisionTileAt(tileX: number, tileY: number): CollisionTile {
    const row = this.collisionGrid[tileY];
    if (!row) {
      return createEmptyCollisionTile();
    }
    return row[tileX] ?? createEmptyCollisionTile();
  }

  private getCollisionTilesAt(tile: TilePosition): CollisionTiles {
    const { x, y } = tile;
    return {
      current: this.getCollisionTileAt(x, y),
      up: this.getCollisionTileAt(x, y - 1),
      down: this.getCollisionTileAt(x, y + 1),
      left: this.getCollisionTileAt(x - 1, y),
      right: this.getCollisionTileAt(x + 1, y),
    };
  }

  private getCollisionTilesFor(entity: MovableEntity): CollisionTiles {
    return this.getCollisionTilesAt(entity.tile);
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

  private getAvailableDirections(
    collisionTiles: CollisionTiles,
    currentDirection: Direction,
    actor: MovementActor,
  ): Direction[] {
    return getAvailableDirectionsHelper(collisionTiles, currentDirection, this.tileSize, actor);
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

  private syncEntityPosition(entity: PacmanSprite | GhostSprite): void {
    const world = this.toWorldPosition(entity.tile, entity.moved);
    entity.x = world.x;
    entity.y = world.y;
  }

  private setEntityTile(entity: PacmanSprite | GhostSprite, tile: TilePosition): void {
    entity.tile = { ...tile };
    entity.moved = { x: 0, y: 0 };
    this.syncEntityPosition(entity);
  }

  private canGhostMoveFromTile(tile: TilePosition): boolean {
    const collisionTiles = this.getCollisionTilesAt(tile);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    return directions.some((direction) => this.canMove(direction, 0, 0, collisionTiles, this.tileSize, 'ghost'));
  }

  private findGhostReleaseTile(currentTile: TilePosition, avoidTile: TilePosition): TilePosition {
    const releaseY = clamp(this.ghostJailY - 1, 0, this.map.height - 1);
    const candidates: TilePosition[] = [];

    for (let x = this.ghostJailMinX; x <= this.ghostJailMaxX; x += 1) {
      const tile = { x, y: releaseY };
      if (tile.x === avoidTile.x && tile.y === avoidTile.y) {
        continue;
      }

      if (this.canGhostMoveFromTile(tile)) {
        candidates.push(tile);
      }
    }

    const fallback = this.clampTilePosition({ x: currentTile.x, y: releaseY });
    if (candidates.length === 0) {
      return fallback;
    }

    const currentX = clamp(currentTile.x, this.ghostJailMinX, this.ghostJailMaxX);
    const nearby = candidates.filter((candidate) => Math.abs(candidate.x - currentX) <= 1);
    if (nearby.length > 0) {
      return nearby[this.randomInt(nearby.length)] ?? fallback;
    }

    let nearestDistance = Number.POSITIVE_INFINITY;
    candidates.forEach((candidate) => {
      nearestDistance = Math.min(nearestDistance, Math.abs(candidate.x - currentX));
    });

    const nearestCandidates = candidates.filter((candidate) => Math.abs(candidate.x - currentX) === nearestDistance);
    return nearestCandidates[this.randomInt(nearestCandidates.length)] ?? fallback;
  }

  private moveGhostInJail(ghost: GhostSprite): void {
    if (ghost.tile.y !== this.ghostJailY || ghost.moved.y !== 0) {
      this.setEntityTile(ghost, { x: ghost.tile.x, y: this.ghostJailY });
    }

    if (ghost.moved.x === 0) {
      if (ghost.direction !== 'left' && ghost.direction !== 'right') {
        ghost.direction = this.rng() < 0.5 ? 'right' : 'left';
      }

      if (ghost.tile.x <= this.ghostJailMinX && ghost.direction === 'left') {
        ghost.direction = 'right';
      } else if (ghost.tile.x >= this.ghostJailMaxX && ghost.direction === 'right') {
        ghost.direction = 'left';
      }
    }

    this.advanceEntity(ghost, ghost.direction, GHOST_JAIL_MOVE_SPEED);

    if (ghost.tile.x < this.ghostJailMinX || ghost.tile.x > this.ghostJailMaxX) {
      const clampedX = clamp(ghost.tile.x, this.ghostJailMinX, this.ghostJailMaxX);
      this.setEntityTile(ghost, { x: clampedX, y: this.ghostJailY });
      ghost.direction = ghost.direction === 'left' ? 'right' : 'left';
    }
  }

  private resolveSpawnTile(objectTile: ParsedTiledMap['pacmanSpawn'], fallback: TilePosition): TilePosition {
    return this.clampTilePosition(this.getObjectTilePosition(objectTile, fallback));
  }

  private getObjectTilePosition(objectTile: ParsedTiledMap['pacmanSpawn'], fallback: TilePosition): TilePosition {
    const gridX = getObjectNumberProperty(objectTile, 'gridX');
    const gridY = getObjectNumberProperty(objectTile, 'gridY');

    if (typeof gridX === 'number' && typeof gridY === 'number') {
      return { x: gridX, y: gridY };
    }

    if (objectTile && typeof objectTile.x === 'number' && typeof objectTile.y === 'number') {
      return {
        x: this.worldToTileX(objectTile.x),
        y: this.worldToTileY(objectTile.y),
      };
    }

    return fallback;
  }

  private clampTilePosition(tile: TilePosition): TilePosition {
    return {
      x: clamp(tile.x, 0, this.map.width - 1),
      y: clamp(tile.y, 0, this.map.height - 1),
    };
  }

  private toWorldPosition(tile: TilePosition, moved: MovementProgress): { x: number; y: number } {
    return {
      x: this.tileToWorldX(tile.x) + this.tileCenterOffset + moved.x,
      y: this.tileToWorldY(tile.y) + this.tileCenterOffset + moved.y,
    };
  }

  private tileToWorldX(tileX: number): number {
    return tileX * this.tileSize;
  }

  private tileToWorldY(tileY: number): number {
    return tileY * this.tileSize;
  }

  private worldToTileX(worldX: number): number {
    return Math.floor(worldX / this.tileSize);
  }

  private worldToTileY(worldY: number): number {
    return Math.floor(worldY / this.tileSize);
  }

  private get tileCenterOffset(): number {
    return this.tileSize / 2;
  }

  private randomInt(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(this.rng() * maxExclusive);
  }
}

let activeApp: GameApp | null = null;

export async function startGameApp(options: StartGameAppOptions = {}): Promise<void> {
  activeApp?.destroy();
  const app = new GameApp(options);
  await app.start();
  activeApp = app;
}

export function stopGameApp(): void {
  activeApp?.destroy();
  activeApp = null;
}
