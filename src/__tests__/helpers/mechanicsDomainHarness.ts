import { GHOST_SCARED_DURATION_MS, SPEED, SPRITE_SIZE, TILE_SIZE } from '../../config/constants';
import { GhostEntity, GhostKey } from '../../game/domain/entities/GhostEntity';
import { PacmanEntity } from '../../game/domain/entities/PacmanEntity';
import { GhostDecisionService } from '../../game/domain/services/GhostDecisionService';
import { clearGhostScaredWindow, setGhostScaredWindow } from '../../game/domain/services/GhostScaredStateService';
import { GhostJailService, getObjectNumberProperty } from '../../game/domain/services/GhostJailService';
import { MovementRules } from '../../game/domain/services/MovementRules';
import { PortalService } from '../../game/domain/services/PortalService';
import { Direction } from '../../game/domain/valueObjects/Direction';
import { TilePosition } from '../../game/domain/valueObjects/TilePosition';
import { CollisionGrid } from '../../game/domain/world/CollisionGrid';
import { WorldState } from '../../game/domain/world/WorldState';
import { TimerSchedulerAdapter } from '../../game/infrastructure/adapters/TimerSchedulerAdapter';
import { SeededRandom } from '../../game/shared/random/SeededRandom';
import { AnimationSystem } from '../../game/systems/AnimationSystem';
import { GhostMovementSystem } from '../../game/systems/GhostMovementSystem';
import { GhostPacmanCollisionSystem } from '../../game/systems/GhostPacmanCollisionSystem';
import { GhostReleaseSystem } from '../../game/systems/GhostReleaseSystem';
import { PacmanMovementSystem } from '../../game/systems/PacmanMovementSystem';
import { MechanicsScenario, MechanicsSnapshot } from './mechanicsTypes';
import { createHarnessMap, HarnessFixture } from './mechanicsDomainMapFactory';

export type { HarnessFixture } from './mechanicsDomainMapFactory';

const DEFAULT_TICK_MS = 1000 / 60;
const GHOST_KEYS: GhostKey[] = ['inky', 'clyde', 'pinky', 'blinky'];

export interface HarnessAction {
  tick: number;
  type: 'set-pacman-next-direction' | 'pause' | 'resume' | 'set-ghost-scared';
  direction?: Direction;
  scared?: boolean;
  ghostIndex?: number;
}

export interface MechanicsRunResult {
  snapshots: MechanicsSnapshot[];
  trace: string[];
  finalSnapshot: MechanicsSnapshot;
}

export interface MechanicsDomainHarnessOptions {
  seed?: number;
  fixture?: HarnessFixture;
  ghostCount?: number;
  autoStartSystems?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export class MechanicsDomainHarness {
  readonly world: WorldState;
  readonly movementRules: MovementRules;
  readonly scheduler: TimerSchedulerAdapter;
  readonly jailService: GhostJailService;
  readonly portalService: PortalService;
  readonly decisions: GhostDecisionService;
  readonly pacmanSystem: PacmanMovementSystem;
  readonly ghostReleaseSystem: GhostReleaseSystem;
  readonly ghostMovementSystem: GhostMovementSystem;
  readonly ghostPacmanCollisionSystem: GhostPacmanCollisionSystem;
  readonly animationSystem: AnimationSystem;
  readonly trace: string[] = [];
  readonly snapshots: MechanicsSnapshot[] = [];

  private schedulerPaused = false;

  constructor(private readonly options: MechanicsDomainHarnessOptions = {}) {
    const seed = options.seed ?? Number(process.env.MECHANICS_SEED ?? 1337);
    const rng = new SeededRandom(seed);
    const fixture = options.fixture ?? 'default-map';

    const safeMap = createHarnessMap(fixture);
    const tileSize = safeMap.tileWidth || TILE_SIZE;

    const collisionGrid = new CollisionGrid(safeMap.tiles.map((row) => row.map((tile) => ({ ...tile.collision }))));
    this.movementRules = new MovementRules(tileSize);
    this.jailService = new GhostJailService();

    const centerTile: TilePosition = {
      x: Math.floor(safeMap.width / 2),
      y: Math.floor(safeMap.height / 2),
    };

    const pacmanTile = this.jailService.resolveSpawnTile(safeMap.pacmanSpawn, centerTile, safeMap);
    const ghostJailBounds = this.jailService.resolveGhostJailBounds(safeMap, pacmanTile);

    const ghostCountRaw = options.ghostCount ?? getObjectNumberProperty(safeMap.ghostHome, 'ghostCount') ?? 4;
    const ghostCount = Math.max(0, Math.round(ghostCountRaw));

    const pacman = new PacmanEntity(pacmanTile, SPRITE_SIZE.pacman, SPRITE_SIZE.pacman);
    this.movementRules.setEntityTile(pacman, pacmanTile);

    const ghosts: GhostEntity[] = [];
    for (let index = 0; index < ghostCount; index += 1) {
      const range = ghostJailBounds.maxX - ghostJailBounds.minX + 1;
      const randomSpawnX = ghostJailBounds.minX + rng.int(Math.max(1, range));
      const spawnTile = {
        x: clamp(randomSpawnX, 0, safeMap.width - 1),
        y: clamp(ghostJailBounds.y, 0, safeMap.height - 1),
      };

      const ghost = new GhostEntity({
        key: GHOST_KEYS[index % GHOST_KEYS.length],
        tile: spawnTile,
        direction: rng.next() < 0.5 ? 'right' : 'left',
        speed: SPEED.ghost,
        displayWidth: SPRITE_SIZE.ghost,
        displayHeight: SPRITE_SIZE.ghost,
      });

      this.movementRules.setEntityTile(ghost, spawnTile);
      ghosts.push(ghost);
    }

    this.world = new WorldState({
      map: safeMap,
      tileSize,
      collisionGrid,
      pacmanSpawnTile: pacmanTile,
      pacman,
      ghosts,
      ghostJailBounds,
    });

    this.scheduler = new TimerSchedulerAdapter();
    this.portalService = new PortalService(collisionGrid);
    this.decisions = new GhostDecisionService();

    this.pacmanSystem = new PacmanMovementSystem(this.world, this.movementRules, this.portalService);
    this.ghostReleaseSystem = new GhostReleaseSystem(this.world, this.movementRules, this.jailService, this.scheduler, rng);
    this.ghostMovementSystem = new GhostMovementSystem(
      this.world,
      this.movementRules,
      this.decisions,
      this.portalService,
      rng,
    );
    this.ghostPacmanCollisionSystem = new GhostPacmanCollisionSystem(
      this.world,
      this.movementRules,
      SPEED.ghost,
    );
    this.animationSystem = new AnimationSystem(this.world, SPEED.ghost);

    if (options.autoStartSystems ?? true) {
      this.ghostReleaseSystem.start();
      this.animationSystem.start();
    }

    this.trace.push(`seed=${seed}`);
    this.trace.push(`fixture=${fixture}`);
  }

  destroy(): void {
    this.ghostReleaseSystem.destroy();
    this.scheduler.clear();
  }

  setPacmanNextDirection(direction: Direction): void {
    this.world.pacman.direction.next = direction;
    this.trace.push(`tick=${this.world.tick} set-next-direction=${direction}`);
  }

  setGhostScared(scared: boolean, ghostIndex?: number): void {
    if (typeof ghostIndex === 'number') {
      const ghost = this.world.ghosts[ghostIndex];
      if (ghost) {
        if (scared) {
          setGhostScaredWindow(this.world, ghost, GHOST_SCARED_DURATION_MS);
        } else {
          clearGhostScaredWindow(this.world, ghost);
        }
      }
    } else {
      this.world.ghosts.forEach((ghost) => {
        if (scared) {
          setGhostScaredWindow(this.world, ghost, GHOST_SCARED_DURATION_MS);
        } else {
          clearGhostScaredWindow(this.world, ghost);
        }
      });
    }

    this.trace.push(`tick=${this.world.tick} set-ghost-scared=${scared}`);
  }

  pause(): void {
    this.world.isMoving = false;
    this.schedulerPaused = true;
    this.scheduler.setPaused(true);
    this.trace.push(`tick=${this.world.tick} pause`);
  }

  resume(): void {
    this.world.isMoving = true;
    this.schedulerPaused = false;
    this.scheduler.setPaused(false);
    this.trace.push(`tick=${this.world.tick} resume`);
  }

  snapshot(): MechanicsSnapshot {
    return {
      tick: this.world.tick,
      pacman: {
        tile: { ...this.world.pacman.tile },
        moved: { ...this.world.pacman.moved },
        world: { x: this.world.pacman.x, y: this.world.pacman.y },
        direction: this.world.pacman.direction.current,
      },
      ghosts: this.world.ghosts.map((ghost) => ({
        tile: { ...ghost.tile },
        moved: { ...ghost.moved },
        world: { x: ghost.x, y: ghost.y },
        direction: ghost.direction,
        speed: ghost.speed,
        free: ghost.state.free,
      })),
      worldFlags: {
        isMoving: this.world.isMoving,
        collisionDebugEnabled: this.world.collisionDebugEnabled,
        ghostsExitingJail: this.world.ghostsExitingJail.size,
      },
      schedulerState: {
        paused: this.schedulerPaused,
      },
    };
  }

  stepTick(deltaMs = DEFAULT_TICK_MS): MechanicsSnapshot {
    if (this.world.isMoving) {
      this.world.nextTick();
      this.scheduler.update(deltaMs);
      this.pacmanSystem.update();
      this.ghostReleaseSystem.update();
      this.ghostMovementSystem.update();
      this.ghostPacmanCollisionSystem.update();
      this.animationSystem.update(deltaMs);
    }

    const snapshot = this.snapshot();
    this.snapshots.push(snapshot);
    return snapshot;
  }

  runTicks(ticks: number, deltaMs = DEFAULT_TICK_MS): MechanicsSnapshot[] {
    const results: MechanicsSnapshot[] = [];
    for (let i = 0; i < ticks; i += 1) {
      results.push(this.stepTick(deltaMs));
    }
    return results;
  }

  runScenario(params: {
    scenario: MechanicsScenario;
    actions?: HarnessAction[];
    tickMs?: number;
  }): MechanicsRunResult {
    const actions = [...(params.actions ?? [])].sort((a, b) => a.tick - b.tick);
    const tickMs = params.tickMs ?? DEFAULT_TICK_MS;

    this.trace.push(`scenario=${params.scenario.id}`);

    for (let tick = 1; tick <= params.scenario.ticks; tick += 1) {
      actions
        .filter((action) => action.tick === tick)
        .forEach((action) => {
          this.applyAction(action);
        });
      this.stepTick(tickMs);
    }

    const finalSnapshot = this.snapshots[this.snapshots.length - 1] ?? this.snapshot();

    return {
      snapshots: [...this.snapshots],
      trace: [...this.trace],
      finalSnapshot,
    };
  }

  private applyAction(action: HarnessAction): void {
    if (action.type === 'pause') {
      this.pause();
      return;
    }

    if (action.type === 'resume') {
      this.resume();
      return;
    }

    if (action.type === 'set-pacman-next-direction') {
      if (action.direction) {
        this.setPacmanNextDirection(action.direction);
      }
      return;
    }

    this.setGhostScared(action.scared ?? true, action.ghostIndex);
  }
}
