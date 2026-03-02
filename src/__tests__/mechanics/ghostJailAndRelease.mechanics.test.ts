import { describe, expect, it } from 'vitest';
import { GHOST_JAIL_RELEASE_DELAY_MS, GHOST_JAIL_RELEASE_INTERVAL_MS } from '../../config/constants';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

const FIXED_STEP_MS = 1000 / 60;

function stepReleaseOnlyTick(harness: MechanicsDomainHarness): void {
  harness.world.nextTick();
  harness.scheduler.update(FIXED_STEP_MS);
  harness.ghostReleaseSystem.update();
}

describe('mechanics scenarios: ghost jail and release', () => {
  it('MEC-JAIL-001 jailed ghosts oscillate within jail bounds before release', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-001');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
    });

    try {
      const result = harness.runScenario({ scenario });
      const bounds = harness.world.ghostJailBounds;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: result.finalSnapshot.tick,
          inputTrace: result.trace,
          snapshotWindow: result.snapshots.slice(-12),
          assertion: 'jailed ghost x should remain inside jail bounds before release delay expires',
        },
        () => {
          const xs = result.snapshots.map((snapshot) => snapshot.ghosts[0]?.tile.x ?? bounds.minX);
          const allInside = xs.every((x) => x >= bounds.minX && x <= bounds.maxX);

          expect(allInside).toBe(true);
          expect(harness.world.ghosts[0]?.state.free).toBe(false);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-JAIL-002 release timer and phased transition drive ghost into free state', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-002');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
    });

    try {
      const snapshots: Array<ReturnType<MechanicsDomainHarness['snapshot']>> = [];
      for (let tick = 0; tick < scenario.ticks; tick += 1) {
        harness.world.nextTick();
        harness.scheduler.update(1000 / 60);
        harness.ghostReleaseSystem.update();
        snapshots.push(harness.snapshot());
      }

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [...harness.trace, 'manual release-only tick loop'],
          snapshotWindow: snapshots.slice(-12),
          assertion: 'ghost should enter free state after staged delay and phased release path',
        },
        () => {
          const becameFree = snapshots.some((snapshot) => snapshot.ghosts[0]?.free === true);
          const hadReleasePhase = snapshots.some((snapshot) => snapshot.worldFlags.ghostsExitingJail > 0);

          expect(becameFree).toBe(true);
          expect(hadReleasePhase).toBe(true);
          expect(harness.world.ghostsExitingJail.size).toBe(0);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-JAIL-003 pen-gate crossing is blocked for free ghosts but allowed for release actor', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-003');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'pen-gate-grid',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['evaluate pen-gate movement checks for ghost and ghostRelease actors'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'normal ghost movement should stay gate-locked while release actor can cross gate',
        },
        () => {
          const collisionTiles = harness.world.collisionGrid.getTilesAt({ x: 0, y: 1 });
          const freeGhostCanCross = harness.movementRules.canMove('down', 0, 0, collisionTiles, 'ghost');
          const releaseGhostCanCross = harness.movementRules.canMove('down', 0, 0, collisionTiles, 'ghostRelease');

          expect(freeGhostCanCross).toBe(false);
          expect(releaseGhostCanCross).toBe(true);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-JAIL-004 release side staging alternates left then right by release order', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-004');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 2,
      autoStartSystems: false,
    });

    try {
      const [firstGhost, secondGhost] = harness.world.ghosts;
      if (!firstGhost || !secondGhost) {
        throw new Error('expected two ghosts for side alternation scenario');
      }

      const centerX =
        harness.world.ghostJailBounds.minX +
        Math.floor((harness.world.ghostJailBounds.maxX - harness.world.ghostJailBounds.minX) / 2);
      harness.movementRules.setEntityTile(firstGhost, { x: centerX, y: harness.world.ghostJailBounds.y });
      harness.movementRules.setEntityTile(secondGhost, { x: centerX, y: harness.world.ghostJailBounds.y });

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['trigger first and second scheduled releases', 'observe release-stage direction on entry'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'first release starts toward left side and second release starts toward right side',
        },
        () => {
          harness.ghostReleaseSystem.start();
          harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
          harness.ghostReleaseSystem.update();
          expect(firstGhost.direction).toBe('left');

          for (let tick = 0; tick < scenario.ticks && !firstGhost.state.free; tick += 1) {
            harness.ghostReleaseSystem.update();
          }
          expect(firstGhost.state.free).toBe(true);

          harness.scheduler.update(GHOST_JAIL_RELEASE_INTERVAL_MS);
          harness.ghostReleaseSystem.update();
          expect(secondGhost.direction).toBe('right');
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-JAIL-005 ghost re-jail and re-release restores release crossing flow', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-005');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for re-release scenario');
      }

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['release ghost once', 'send ghost back to jail state', 'release same ghost again'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'ghost should re-enter exiting phase and become free again after jail return',
        },
        () => {
          harness.ghostReleaseSystem.start();
          harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);
          let sawFirstExit = false;
          for (let tick = 0; tick < scenario.ticks && !ghost.state.free; tick += 1) {
            harness.ghostReleaseSystem.update();
            sawFirstExit ||= harness.world.ghostsExitingJail.has(ghost);
          }
          expect(sawFirstExit).toBe(true);
          expect(ghost.state.free).toBe(true);

          harness.movementRules.setEntityTile(ghost, harness.world.ghostJailReturnTile);
          ghost.state.free = false;
          ghost.state.soonFree = true;

          harness.ghostReleaseSystem.update();
          let sawSecondExit = false;
          for (let tick = 0; tick < scenario.ticks && !ghost.state.free; tick += 1) {
            stepReleaseOnlyTick(harness);
            sawSecondExit ||= harness.world.ghostsExitingJail.has(ghost);
          }

          expect(sawSecondExit).toBe(true);
          expect(ghost.state.free).toBe(true);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-JAIL-006 release path remains bounded to jail corridor and release row', () => {
    const scenario = getScenarioOrThrow('MEC-JAIL-006');
    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for release bounds scenario');
      }

      harness.ghostReleaseSystem.start();
      harness.scheduler.update(GHOST_JAIL_RELEASE_DELAY_MS);

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['record release-phase tile positions until free'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'exiting ghost should stay within jail x-bounds and between jail row and release row',
        },
        () => {
          const bounds = harness.world.ghostJailBounds;
          const releaseY = bounds.y - 1;
          const observedTiles: Array<{ x: number; y: number }> = [];

          for (let tick = 0; tick < scenario.ticks && !ghost.state.free; tick += 1) {
            harness.ghostReleaseSystem.update();
            if (harness.world.ghostsExitingJail.has(ghost)) {
              observedTiles.push({ x: ghost.tile.x, y: ghost.tile.y });
            }
          }

          expect(ghost.state.free).toBe(true);
          expect(observedTiles.length).toBeGreaterThan(0);
          const inBounds = observedTiles.every(
            (tile) => tile.x >= bounds.minX && tile.x <= bounds.maxX && tile.y >= releaseY && tile.y <= bounds.y,
          );
          expect(inBounds).toBe(true);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
