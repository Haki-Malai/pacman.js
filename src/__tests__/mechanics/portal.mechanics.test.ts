import { describe, expect, it } from 'vitest';
import { createBlockedPortalGrid, createPortalPairGrid } from '../fixtures/collisionFixtures';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';
import { PortalService } from '../../game/domain/services/PortalService';
import { PortalPair } from '../../game/domain/world/WorldState';

function isHorizontalPair(pair: PortalPair): boolean {
  return pair.from.y === pair.to.y;
}

function isVerticalPair(pair: PortalPair): boolean {
  return pair.from.x === pair.to.x;
}

function oppositeEndpoint(pair: PortalPair, endpoint: { x: number; y: number }): { x: number; y: number } {
  if (pair.from.x === endpoint.x && pair.from.y === endpoint.y) {
    return pair.to;
  }
  return pair.from;
}

function outwardDirectionFromSource(source: { x: number; y: number }, destination: { x: number; y: number }) {
  if (source.x !== destination.x) {
    return source.x < destination.x ? 'left' : 'right';
  }
  return source.y < destination.y ? 'up' : 'down';
}

describe('mechanics scenarios: portals', () => {
  it('MEC-PORT-001 teleport requires centered entity', () => {
    const scenario = getScenarioOrThrow('MEC-PORT-001');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 10,
        inputTrace: ['try teleport offset', 'try teleport centered'],
        snapshotWindow: [],
        assertion: 'only centered entity may teleport through portal',
      },
      () => {
        const grid = createPortalPairGrid();
        const portals = new PortalService(grid);

        const entity = {
          tile: { x: 0, y: 1 },
          moved: { x: 3, y: 0 },
        };

        const movedWhileOffset = portals.tryTeleport(entity, grid, 10);
        expect(movedWhileOffset).toBe(false);
        expect(entity.tile).toEqual({ x: 0, y: 1 });

        entity.moved = { x: 0, y: 0 };
        const movedWhileCentered = portals.tryTeleport(entity, grid, 10);
        expect(movedWhileCentered).toBe(true);
        expect(entity.tile).toEqual({ x: 4, y: 1 });
      },
    );
  });

  it('MEC-PORT-002 same-tick bounce guard prevents immediate return teleport', () => {
    const scenario = getScenarioOrThrow('MEC-PORT-002');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 22,
        inputTrace: ['teleport once', 'attempt second teleport same tick'],
        snapshotWindow: [],
        assertion: 'same entity cannot teleport twice in the same tick',
      },
      () => {
        const grid = createPortalPairGrid();
        const portals = new PortalService(grid);
        const entity = {
          tile: { x: 0, y: 1 },
          moved: { x: 0, y: 0 },
        };

        const first = portals.tryTeleport(entity, grid, 22);
        const second = portals.tryTeleport(entity, grid, 22);

        expect(first).toBe(true);
        expect(second).toBe(false);
        expect(entity.tile).toEqual({ x: 4, y: 1 });
      },
    );
  });

  it('MEC-PORT-003 blocked destination portal tile refuses teleport', () => {
    const scenario = getScenarioOrThrow('MEC-PORT-003');

    runMechanicsAssertion(
      {
        scenarioId: scenario.id,
        seed: scenario.seed,
        tick: 33,
        inputTrace: ['attempt teleport to fully blocking destination'],
        snapshotWindow: [],
        assertion: 'teleport should fail when destination portal tile is fully blocked',
      },
      () => {
        const grid = createBlockedPortalGrid();
        const portals = new PortalService(grid);
        const entity = {
          tile: { x: 0, y: 1 },
          moved: { x: 0, y: 0 },
        };

        const moved = portals.tryTeleport(entity, grid, 33);

        expect(moved).toBe(false);
        expect(entity.tile).toEqual({ x: 0, y: 1 });
      },
    );
  });

  it('MEC-PORT-004 default map exposes deterministic portal pairs and teleports between endpoints', () => {
    const scenario = getScenarioOrThrow('MEC-PORT-004');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 0,
      autoStartSystems: false,
    });

    try {
      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['inspect parsed portal endpoint tiles', 'attempt centered teleport from left endpoint'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'default map portal endpoint pairs are deterministic and centered teleport succeeds between endpoints',
        },
        () => {
          const portalPairs = harness.world.map.portalPairs ?? [];
          expect(portalPairs.length).toBeGreaterThanOrEqual(1);

          portalPairs.forEach((pair) => {
            expect(harness.world.collisionGrid.getTileAt(pair.from.x, pair.from.y).portal).toBe(true);
            expect(harness.world.collisionGrid.getTileAt(pair.to.x, pair.to.y).portal).toBe(true);
          });

          const pair = portalPairs[0];
          const destination = oppositeEndpoint(pair, pair.from);

          harness.movementRules.setEntityTile(harness.world.pacman, pair.from);
          const outwardDirection = outwardDirectionFromSource(pair.from, destination);
          harness.world.pacman.direction.current = outwardDirection;
          harness.world.pacman.direction.next = outwardDirection;
          harness.world.pacman.moved = { x: 0, y: 0 };

          const moved = harness.portalService.tryTeleport(harness.world.pacman, harness.world.collisionGrid, 44);

          expect(moved).toBe(true);
          expect(harness.world.pacman.tile).toEqual(destination);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-PORT-006 vertical portal pair teleports between top and bottom endpoints', () => {
    const scenario = getScenarioOrThrow('MEC-PORT-006');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 0,
      autoStartSystems: false,
    });

    try {
      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['set pacman at top endpoint', 'hold outward up direction', 'run one tick'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'top/bottom production endpoints teleport symmetrically while centered',
        },
        () => {
          const verticalPair = (harness.world.map.portalPairs ?? []).find((pair) => isVerticalPair(pair));
          expect(verticalPair).toBeDefined();
          const pair = verticalPair as PortalPair;
          const topEndpoint = pair.from.y <= pair.to.y ? pair.from : pair.to;
          const bottomEndpoint = topEndpoint === pair.from ? pair.to : pair.from;

          harness.movementRules.setEntityTile(harness.world.pacman, topEndpoint);
          harness.world.pacman.direction.current = 'up';
          harness.world.pacman.direction.next = 'up';
          harness.world.pacman.moved = { x: 0, y: 0 };

          const toBottom = harness.stepTick();
          expect(toBottom.pacman.tile).toEqual(bottomEndpoint);

          harness.world.pacman.direction.current = 'down';
          harness.world.pacman.direction.next = 'down';
          harness.world.pacman.moved = { x: 0, y: 0 };

          const toTop = harness.stepTick();
          expect(toTop.pacman.tile).toEqual(topEndpoint);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-PORT-005 portal endpoint outward input does not leak to void and still teleports', () => {
    const scenario = getScenarioOrThrow('MEC-PORT-005');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 0,
      autoStartSystems: false,
    });

    try {
      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['set pacman at right portal endpoint', 'hold outward direction right', 'run one tick'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'outward input at portal endpoint should not leak into void and should resolve endpoint teleport',
        },
        () => {
          const horizontalPair = (harness.world.map.portalPairs ?? []).find((pair) => isHorizontalPair(pair));
          expect(horizontalPair).toBeDefined();
          const pair = horizontalPair as PortalPair;
          const outwardEndpoint = pair.from.x >= pair.to.x ? pair.from : pair.to;
          const inwardEndpoint = outwardEndpoint === pair.from ? pair.to : pair.from;
          const outwardDirection =
            outwardEndpoint.x !== inwardEndpoint.x
              ? outwardEndpoint.x > inwardEndpoint.x
                ? 'right'
                : 'left'
              : outwardEndpoint.y > inwardEndpoint.y
                ? 'down'
                : 'up';

          harness.movementRules.setEntityTile(harness.world.pacman, outwardEndpoint);
          harness.world.pacman.direction.current = outwardDirection;
          harness.world.pacman.direction.next = outwardDirection;
          harness.world.pacman.moved = { x: 0, y: 0 };

          const snapshot = harness.stepTick();

          expect(snapshot.pacman.tile).toEqual(inwardEndpoint);
          expect(snapshot.pacman.tile.x).toBeGreaterThanOrEqual(0);
          expect(snapshot.pacman.tile.x).toBeLessThan(harness.world.map.width);
          expect(snapshot.pacman.tile.y).toBeGreaterThanOrEqual(0);
          expect(snapshot.pacman.tile.y).toBeLessThan(harness.world.map.height);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('demo map inferred horizontal portals teleport on outward input without void leak', () => {
    const harness = new MechanicsDomainHarness({
      seed: 2707,
      fixture: 'demo-map',
      ghostCount: 0,
      autoStartSystems: false,
    });

    try {
      const horizontalPair = (harness.world.map.portalPairs ?? []).find((pair) => isHorizontalPair(pair));
      expect(horizontalPair).toBeDefined();
      const pair = horizontalPair as PortalPair;

      const outwardEndpoint = pair.from.x >= pair.to.x ? pair.from : pair.to;
      const inwardEndpoint = outwardEndpoint === pair.from ? pair.to : pair.from;
      const outwardDirection = outwardEndpoint.x > inwardEndpoint.x ? 'right' : 'left';

      harness.movementRules.setEntityTile(harness.world.pacman, outwardEndpoint);
      harness.world.pacman.direction.current = outwardDirection;
      harness.world.pacman.direction.next = outwardDirection;
      harness.world.pacman.moved = { x: 0, y: 0 };

      const snapshot = harness.stepTick();

      expect(snapshot.pacman.tile).toEqual(inwardEndpoint);
      expect(snapshot.pacman.tile.x).toBeGreaterThanOrEqual(0);
      expect(snapshot.pacman.tile.x).toBeLessThan(harness.world.map.width);
      expect(snapshot.pacman.tile.y).toBeGreaterThanOrEqual(0);
      expect(snapshot.pacman.tile.y).toBeLessThan(harness.world.map.height);
    } finally {
      harness.destroy();
    }
  });

  it('keeps non-portal tiles from leaking into parsed map void', () => {
    const harness = new MechanicsDomainHarness({
      seed: 1306,
      fixture: 'default-map',
      ghostCount: 0,
      autoStartSystems: false,
    });

    try {
      let leaks = 0;
      for (let y = 0; y < harness.world.map.height; y += 1) {
        for (let x = 0; x < harness.world.map.width; x += 1) {
          const tile = harness.world.map.tiles[y]?.[x];
          if (!tile || tile.gid === null || tile.collision.portal) {
            continue;
          }

          const edges = [
            { dx: 0, dy: -1, blocked: tile.collision.up },
            { dx: 1, dy: 0, blocked: tile.collision.right },
            { dx: 0, dy: 1, blocked: tile.collision.down },
            { dx: -1, dy: 0, blocked: tile.collision.left },
          ];

          const hasLeak = edges.some(({ dx, dy, blocked }) => {
            const neighbor = harness.world.map.tiles[y + dy]?.[x + dx];
            return (!neighbor || neighbor.gid === null) && !blocked;
          });

          if (hasLeak) {
            leaks += 1;
          }
        }
      }

      expect(leaks).toBe(0);
    } finally {
      harness.destroy();
    }
  });
});
