import { describe, expect, it } from 'vitest';
import { createBlockedPortalGrid, createPortalPairGrid } from '../fixtures/collisionFixtures';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';
import { PortalService } from '../../game/domain/services/PortalService';

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
          const left = { x: 1, y: 26 };
          const right = { x: 49, y: 26 };
          const top = { x: 25, y: 1 };
          const bottom = { x: 25, y: 49 };

          expect(harness.world.collisionGrid.getTileAt(left.x, left.y).portal).toBe(true);
          expect(harness.world.collisionGrid.getTileAt(right.x, right.y).portal).toBe(true);
          expect(harness.world.collisionGrid.getTileAt(top.x, top.y).portal).toBe(true);
          expect(harness.world.collisionGrid.getTileAt(bottom.x, bottom.y).portal).toBe(true);
          expect(harness.world.collisionGrid.getTileAt(48, 26).portal).toBe(false);
          expect(harness.world.collisionGrid.getTileAt(25, 2).portal).toBe(false);

          expect(harness.world.map.portalPairs).toEqual([
            { from: left, to: right },
            { from: top, to: bottom },
          ]);

          harness.movementRules.setEntityTile(harness.world.pacman, left);
          harness.world.pacman.moved = { x: 0, y: 0 };

          const moved = harness.portalService.tryTeleport(harness.world.pacman, harness.world.collisionGrid, 44);

          expect(moved).toBe(true);
          expect(harness.world.pacman.tile).toEqual(right);
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
          const topEndpoint = { x: 25, y: 1 };
          const bottomEndpoint = { x: 25, y: 49 };

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
          const leftEndpoint = { x: 1, y: 26 };
          const rightEndpoint = { x: 49, y: 26 };
          const rightVoid = { x: 50, y: 26 };

          expect(harness.world.collisionGrid.getTileAt(rightVoid.x, rightVoid.y).collides).toBe(true);

          harness.movementRules.setEntityTile(harness.world.pacman, rightEndpoint);
          harness.world.pacman.direction.current = 'right';
          harness.world.pacman.direction.next = 'right';
          harness.world.pacman.moved = { x: 0, y: 0 };

          const snapshot = harness.stepTick();

          expect(snapshot.pacman.tile).toEqual(leftEndpoint);
          expect(snapshot.pacman.tile).not.toEqual(rightVoid);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('blocks movement into default-map non-portal void-leak tiles', () => {
    const harness = new MechanicsDomainHarness({
      seed: 1306,
      fixture: 'default-map',
      ghostCount: 0,
      autoStartSystems: false,
    });

    try {
      const start = { x: 24, y: 2 };
      const blocked = { x: 24, y: 1 };

      expect(harness.world.collisionGrid.getTileAt(blocked.x, blocked.y).portal).toBe(false);
      expect(harness.world.collisionGrid.getTileAt(blocked.x, blocked.y).collides).toBe(true);

      harness.movementRules.setEntityTile(harness.world.pacman, start);
      harness.world.pacman.direction.current = 'up';
      harness.world.pacman.direction.next = 'up';
      harness.world.pacman.moved = { x: 0, y: 0 };

      const snapshot = harness.stepTick();
      expect(snapshot.pacman.tile).toEqual(start);
    } finally {
      harness.destroy();
    }
  });
});
