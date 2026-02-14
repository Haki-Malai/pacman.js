import { describe, expect, it } from 'vitest';
import { createBlockedPortalGrid, createPortalPairGrid } from '../fixtures/collisionFixtures';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
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
});
