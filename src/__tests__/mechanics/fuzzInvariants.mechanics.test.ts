import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createPortalPairGrid, openTile } from '../fixtures/collisionFixtures';
import { readMechanicsSpec } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';
import { PortalService } from '../../game/domain/services/PortalService';
import { canMove } from '../../game/domain/services/MovementRules';

const SCENARIO_FILTER = process.env.MECHANICS_SCENARIO_ID;
const SEED_OVERRIDE = process.env.MECHANICS_SEED ? Number(process.env.MECHANICS_SEED) : undefined;
const BASE_RUNS = Number(process.env.MECHANICS_FUZZ_RUNS ?? 40);
const RUN_MULTIPLIER = Number(process.env.MECHANICS_FUZZ_MULTIPLIER ?? 1);
const MAX_TICKS = Number(process.env.MECHANICS_FUZZ_TICKS ?? 120);
const TILE_SIZE = 16;

function runs(base: number): number {
  return Math.max(1, Math.round(base * RUN_MULTIPLIER));
}

function isFiltered(id: string): boolean {
  return Boolean(SCENARIO_FILTER && SCENARIO_FILTER !== id);
}

function fcOptions(numRuns: number): fc.Parameters<[number, number]> {
  const options: fc.Parameters<[number, number]> = {
    numRuns,
  };
  if (SEED_OVERRIDE !== undefined && Number.isFinite(SEED_OVERRIDE)) {
    options.seed = SEED_OVERRIDE;
  }
  return options;
}

function invariantExists(id: string): void {
  const spec = readMechanicsSpec();
  expect(spec.invariants.some((invariant) => invariant.id === id)).toBe(true);
}

describe('mechanics invariants fuzz', () => {
  it('INV-BOUNDS-001 entities stay within map bounds', () => {
    if (isFiltered('INV-BOUNDS-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-BOUNDS-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 10, max: MAX_TICKS }), (seed, ticks) => {
        const harness = new MechanicsDomainHarness({
          seed,
          fixture: 'default-map',
          ghostCount: 2,
        });

        try {
          const snapshots = harness.runTicks(ticks);
          const width = harness.world.map.width;
          const height = harness.world.map.height;

          runMechanicsAssertion(
            {
              scenarioId: 'INV-BOUNDS-001',
              seed,
              tick: harness.world.tick,
              inputTrace: [...harness.trace, `ticks=${ticks}`],
              snapshotWindow: snapshots.slice(-10),
              assertion: 'all entity tiles must stay in map bounds',
            },
            () => {
              snapshots.forEach((snapshot) => {
                expect(snapshot.pacman.tile.x).toBeGreaterThanOrEqual(0);
                expect(snapshot.pacman.tile.y).toBeGreaterThanOrEqual(0);
                expect(snapshot.pacman.tile.x).toBeLessThan(width);
                expect(snapshot.pacman.tile.y).toBeLessThan(height);

                snapshot.ghosts.forEach((ghost) => {
                  expect(ghost.tile.x).toBeGreaterThanOrEqual(0);
                  expect(ghost.tile.y).toBeGreaterThanOrEqual(0);
                  expect(ghost.tile.x).toBeLessThan(width);
                  expect(ghost.tile.y).toBeLessThan(height);
                });
              });
            },
          );
        } finally {
          harness.destroy();
        }
      }),
      fcOptions(runs(BASE_RUNS)),
    );
  });

  it('INV-COLLIDE-001 blocked edges cannot be crossed from center', () => {
    if (isFiltered('INV-COLLIDE-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-COLLIDE-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 0, max: 3 }), (seed, edgeIndex) => {
        const direction = ['up', 'down', 'left', 'right'][edgeIndex] as 'up' | 'down' | 'left' | 'right';

        const collision = {
          current: openTile(),
          up: openTile(),
          down: openTile(),
          left: openTile(),
          right: openTile(),
        };

        if (direction === 'up') {
          collision.current.up = true;
          collision.up.down = true;
        } else if (direction === 'down') {
          collision.current.down = true;
          collision.down.up = true;
        } else if (direction === 'left') {
          collision.current.left = true;
          collision.left.right = true;
        } else {
          collision.current.right = true;
          collision.right.left = true;
        }

        runMechanicsAssertion(
          {
            scenarioId: 'INV-COLLIDE-001',
            seed,
            tick: 0,
            inputTrace: [`direction=${direction}`],
            snapshotWindow: [],
            assertion: 'movement at center should be blocked on blocked edge',
          },
          () => {
            expect(canMove(direction, 0, 0, collision, TILE_SIZE, 'pacman')).toBe(false);
          },
        );
      }),
      fcOptions(runs(BASE_RUNS * 2)),
    );
  });

  it('INV-JAIL-001 jailed ghosts stay within jail bounds before release', () => {
    if (isFiltered('INV-JAIL-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-JAIL-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 10, max: 240 }), (seed, ticks) => {
        const harness = new MechanicsDomainHarness({
          seed,
          fixture: 'default-map',
          ghostCount: 1,
        });

        try {
          const snapshots = harness.runTicks(ticks);
          const bounds = harness.world.ghostJailBounds;

          runMechanicsAssertion(
            {
              scenarioId: 'INV-JAIL-001',
              seed,
              tick: harness.world.tick,
              inputTrace: [...harness.trace, `ticks=${ticks}`],
              snapshotWindow: snapshots.slice(-10),
              assertion: 'non-free ghosts should remain inside jail x bounds',
            },
            () => {
              snapshots.forEach((snapshot) => {
                snapshot.ghosts.forEach((ghost) => {
                  if (ghost.free) {
                    return;
                  }
                  expect(ghost.tile.x).toBeGreaterThanOrEqual(bounds.minX);
                  expect(ghost.tile.x).toBeLessThanOrEqual(bounds.maxX);
                });
              });
            },
          );
        } finally {
          harness.destroy();
        }
      }),
      fcOptions(runs(BASE_RUNS)),
    );
  });

  it('INV-NAN-001 entity motion values remain finite', () => {
    if (isFiltered('INV-NAN-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-NAN-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 10, max: MAX_TICKS }), (seed, ticks) => {
        const harness = new MechanicsDomainHarness({
          seed,
          fixture: 'default-map',
          ghostCount: 2,
        });

        try {
          const snapshots = harness.runTicks(ticks);

          runMechanicsAssertion(
            {
              scenarioId: 'INV-NAN-001',
              seed,
              tick: harness.world.tick,
              inputTrace: [...harness.trace, `ticks=${ticks}`],
              snapshotWindow: snapshots.slice(-10),
              assertion: 'all motion values should be finite numbers',
            },
            () => {
              snapshots.forEach((snapshot) => {
                const values = [
                  snapshot.pacman.world.x,
                  snapshot.pacman.world.y,
                  snapshot.pacman.moved.x,
                  snapshot.pacman.moved.y,
                  ...snapshot.ghosts.flatMap((ghost) => [ghost.world.x, ghost.world.y, ghost.moved.x, ghost.moved.y]),
                ];

                values.forEach((value) => {
                  expect(Number.isFinite(value)).toBe(true);
                });
              });
            },
          );
        } finally {
          harness.destroy();
        }
      }),
      fcOptions(runs(BASE_RUNS)),
    );
  });

  it('INV-PORT-001 portal same-tick guard blocks bounce', () => {
    if (isFiltered('INV-PORT-001')) {
      expect(true).toBe(true);
      return;
    }
    invariantExists('INV-PORT-001');

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 1, max: 1000 }), (seed, tick) => {
        const grid = createPortalPairGrid();
        const portalService = new PortalService(grid);
        const entity: { tile: { x: number; y: number }; moved: { x: number; y: number }; direction: 'left' | 'right' } = {
          tile: { x: 0, y: 1 },
          moved: { x: -8, y: 0 },
          direction: 'left',
        };

        runMechanicsAssertion(
          {
            scenarioId: 'INV-PORT-001',
            seed,
            tick,
            inputTrace: [`tick=${tick}`],
            snapshotWindow: [],
            assertion: 'second teleport on same tick should be blocked',
          },
          () => {
            expect(portalService.tryTeleport(entity, grid, tick)).toBe(true);
            entity.direction = 'right';
            entity.moved = { x: 8, y: 0 };
            expect(portalService.tryTeleport(entity, grid, tick)).toBe(false);
          },
        );
      }),
      fcOptions(runs(BASE_RUNS * 2)),
    );
  });

});
