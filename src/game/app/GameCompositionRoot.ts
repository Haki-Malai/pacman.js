import { Camera2D } from '../../engine/camera';
import { INITIAL_LIVES, SPEED, SPRITE_SIZE, TILE_SIZE } from '../../config/constants';
import { resetGameState } from '../../state/gameState';
import { GhostEntity, GhostKey } from '../domain/entities/GhostEntity';
import { PacmanEntity } from '../domain/entities/PacmanEntity';
import { GhostDecisionService } from '../domain/services/GhostDecisionService';
import { GhostJailService, getObjectNumberProperty } from '../domain/services/GhostJailService';
import { MovementRules } from '../domain/services/MovementRules';
import { PortalService } from '../domain/services/PortalService';
import { TilePosition } from '../domain/valueObjects/TilePosition';
import { CollisionGrid } from '../domain/world/CollisionGrid';
import { WorldState } from '../domain/world/WorldState';
import { AssetCatalog } from '../infrastructure/assets/AssetCatalog';
import { BrowserInputAdapter } from '../infrastructure/adapters/BrowserInputAdapter';
import { CanvasRendererAdapter } from '../infrastructure/adapters/CanvasRendererAdapter';
import { TimerSchedulerAdapter } from '../infrastructure/adapters/TimerSchedulerAdapter';
import { TiledMapRepository } from '../infrastructure/map/TiledMapRepository';
import { toRandomSource } from '../shared/random/RandomSource';
import { AnimationSystem } from '../systems/AnimationSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { CollectibleSystem } from '../systems/CollectibleSystem';
import { DebugOverlaySystem } from '../systems/DebugOverlaySystem';
import { GhostMovementSystem } from '../systems/GhostMovementSystem';
import { GhostPacmanCollisionSystem } from '../systems/GhostPacmanCollisionSystem';
import { GhostReleaseSystem } from '../systems/GhostReleaseSystem';
import { HudSystem } from '../systems/HudSystem';
import { InputSystem } from '../systems/InputSystem';
import { PacmanMovementSystem } from '../systems/PacmanMovementSystem';
import { PauseOverlaySystem } from '../systems/PauseOverlaySystem';
import { RenderSystem } from '../systems/RenderSystem';
import { ComposedGame, RuntimeControl } from './contracts';

const GHOST_KEYS: GhostKey[] = ['inky', 'clyde', 'pinky', 'blinky'];

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export interface GameCompositionOptions {
  mountId?: string;
  rng?: (() => number) | { next(): number; int(maxExclusive: number): number };
}

export class GameCompositionRoot {
  constructor(private readonly options: GameCompositionOptions = {}) {}

  async compose(runtimeControl: RuntimeControl): Promise<ComposedGame> {
    const mountId = this.options.mountId ?? 'game-root';
    const mount = document.getElementById(mountId);
    if (!mount) {
      throw new Error(`Game mount element not found: #${mountId}`);
    }

    mount.replaceChildren();

    const canvas = document.createElement('canvas');
    canvas.className = 'block h-full w-full touch-none transition-[filter] duration-200 ease-out';
    mount.appendChild(canvas);

    const camera = new Camera2D();
    const renderer = new CanvasRendererAdapter(canvas);
    const input = new BrowserInputAdapter(canvas);
    const scheduler = new TimerSchedulerAdapter();
    const mapRepository = new TiledMapRepository();
    const assets = new AssetCatalog();

    const rng = toRandomSource(this.options.rng ?? Math.random);

    const map = await mapRepository.loadMap('assets/mazes/default/maze.json');
    const tileSize = map.tileWidth || TILE_SIZE;
    await assets.loadForMap(map, 'assets/mazes/default');

    const collisionGrid = new CollisionGrid(map.tiles.map((row) => row.map((tile) => ({ ...tile.collision }))));
    const movementRules = new MovementRules(tileSize);
    const jailService = new GhostJailService();

    const centerTile: TilePosition = {
      x: Math.floor(map.width / 2),
      y: Math.floor(map.height / 2),
    };

    const pacmanTile = jailService.resolveSpawnTile(map.pacmanSpawn, centerTile, map);
    const ghostJailBounds = jailService.resolveGhostJailBounds(map, pacmanTile);

    const ghostCountRaw = getObjectNumberProperty(map.ghostHome, 'ghostCount') ?? 4;
    const ghostCount = Math.max(0, Math.round(ghostCountRaw));

    const pacman = new PacmanEntity(pacmanTile, SPRITE_SIZE.pacman, SPRITE_SIZE.pacman);
    movementRules.setEntityTile(pacman, pacmanTile);

    const ghosts: GhostEntity[] = [];
    for (let i = 0; i < ghostCount; i += 1) {
      const range = ghostJailBounds.maxX - ghostJailBounds.minX + 1;
      const randomSpawnX = ghostJailBounds.minX + rng.int(Math.max(1, range));
      const spawnTile = {
        x: clamp(randomSpawnX, 0, map.width - 1),
        y: clamp(ghostJailBounds.y, 0, map.height - 1),
      };

      const ghost = new GhostEntity({
        key: GHOST_KEYS[i % GHOST_KEYS.length],
        tile: spawnTile,
        direction: rng.next() < 0.5 ? 'right' : 'left',
        speed: SPEED.ghost,
        displayWidth: SPRITE_SIZE.ghost,
        displayHeight: SPRITE_SIZE.ghost,
      });

      movementRules.setEntityTile(ghost, spawnTile);
      ghosts.push(ghost);
    }

    resetGameState(0, INITIAL_LIVES);

    const world = new WorldState({
      map,
      tileSize,
      collisionGrid,
      pacmanSpawnTile: pacmanTile,
      pacman,
      ghosts,
      ghostJailBounds,
    });

    const portalService = new PortalService(collisionGrid, map.portalPairs ?? []);
    const ghostDecisions = new GhostDecisionService();

    const inputSystem = new InputSystem(input, world, runtimeControl);
    const pacmanSystem = new PacmanMovementSystem(world, movementRules, portalService);
    const ghostReleaseSystem = new GhostReleaseSystem(world, movementRules, jailService, scheduler, rng);
    const ghostMovementSystem = new GhostMovementSystem(world, movementRules, ghostDecisions, portalService, rng);
    const ghostPacmanCollisionSystem = new GhostPacmanCollisionSystem(world, movementRules, SPEED.ghost);
    const animationSystem = new AnimationSystem(world, SPEED.ghost);
    const cameraSystem = new CameraSystem(world, camera, renderer, canvas);
    const collectibleSystem = new CollectibleSystem(world);
    const hudSystem = new HudSystem(mount);
    const pauseOverlaySystem = new PauseOverlaySystem(world, mount);
    const debugSystem = new DebugOverlaySystem(world, renderer, camera);
    const renderSystem = new RenderSystem(world, renderer, camera, assets, collectibleSystem);

    const updateSystems = [
      inputSystem,
      pacmanSystem,
      ghostReleaseSystem,
      ghostMovementSystem,
      ghostPacmanCollisionSystem,
      animationSystem,
      cameraSystem,
      collectibleSystem,
      hudSystem,
      pauseOverlaySystem,
      debugSystem,
    ];

    const renderSystems = [renderSystem, debugSystem, hudSystem];

    return {
      world,
      renderer,
      input,
      scheduler,
      updateSystems,
      renderSystems,
      destroy: () => {
        mount.replaceChildren();
      },
    };
  }
}
