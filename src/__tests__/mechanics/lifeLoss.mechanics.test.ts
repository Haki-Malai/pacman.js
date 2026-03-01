import { describe, expect, it } from 'vitest';
import { PACMAN_DEATH_RECOVERY, PACMAN_PORTAL_BLINK } from '../../config/constants';
import { getGameState, resetGameState } from '../../state/gameState';
import { getScenarioOrThrow } from '../helpers/mechanicsSpec';
import { runMechanicsAssertion } from '../helpers/mechanicsTestUtils';
import { MechanicsDomainHarness } from '../helpers/mechanicsDomainHarness';

describe('mechanics scenarios: life loss collision', () => {
  it('MEC-LIFE-001 ghost collision decrements one life and respawns pacman at spawn tile', () => {
    const scenario = getScenarioOrThrow('MEC-LIFE-001');
    resetGameState(0, 3);

    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for life loss scenario');
      }

      const collisionTile = { x: 21, y: 21 };
      harness.movementRules.setEntityTile(harness.world.pacman, collisionTile);
      harness.movementRules.setEntityTile(ghost, collisionTile);
      ghost.state.free = true;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: ['set pacman and one active ghost to same tile', 'run ghost-pacman collision system update'],
          snapshotWindow: [harness.snapshot()],
          assertion: 'one collision should decrement one life and reset pacman to spawn without resetting ghost',
        },
        () => {
          harness.ghostPacmanCollisionSystem.update();

          const snapshot = harness.snapshot();
          expect(getGameState().lives).toBe(2);
          expect(snapshot.pacman.tile).toEqual(harness.world.pacmanSpawnTile);
          expect(snapshot.ghosts[0]?.tile).toEqual(collisionTile);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-LIFE-002 death recovery suppresses collision effects until recovery expires', () => {
    const scenario = getScenarioOrThrow('MEC-LIFE-002');
    resetGameState(0, 3);

    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for death recovery scenario');
      }

      const collisionTile = { x: 21, y: 21 };
      harness.movementRules.setEntityTile(harness.world.pacman, collisionTile);
      harness.movementRules.setEntityTile(ghost, collisionTile);
      ghost.state.free = true;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [
            'collide pacman with active ghost to trigger respawn',
            'collide again while recovery is active',
            'expire recovery and collide again',
          ],
          snapshotWindow: [harness.snapshot()],
          assertion: 'recovery should suppress second life loss until timer expires',
        },
        () => {
          harness.ghostPacmanCollisionSystem.update();
          expect(getGameState().lives).toBe(2);
          expect(harness.world.pacman.deathRecoveryRemainingMs).toBe(PACMAN_DEATH_RECOVERY.durationMs);

          harness.movementRules.setEntityTile(harness.world.pacman, collisionTile);
          harness.movementRules.setEntityTile(ghost, collisionTile);
          harness.ghostPacmanCollisionSystem.update();
          expect(getGameState().lives).toBe(2);

          harness.pacmanSystem.update(PACMAN_DEATH_RECOVERY.durationMs);
          harness.movementRules.setEntityTile(harness.world.pacman, collisionTile);
          harness.movementRules.setEntityTile(ghost, collisionTile);
          harness.ghostPacmanCollisionSystem.update();
          expect(getGameState().lives).toBe(1);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-LIFE-003 portal blink shield suppresses non-scared hits while still allowing scared ghost-hit', () => {
    const scenario = getScenarioOrThrow('MEC-LIFE-003');
    resetGameState(0, 3);

    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for portal shield scenario');
      }

      const collisionTile = { x: 22, y: 22 };
      harness.movementRules.setEntityTile(harness.world.pacman, collisionTile);
      harness.movementRules.setEntityTile(ghost, collisionTile);
      harness.world.pacman.portalBlinkRemainingMs = PACMAN_PORTAL_BLINK.durationMs;
      ghost.state.free = true;
      ghost.state.scared = false;

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [
            'set active portal blink shield',
            'collide with non-scared ghost',
            'collide with scared ghost while shield remains active',
          ],
          snapshotWindow: [harness.snapshot()],
          assertion: 'portal shield suppresses non-scared life loss but still allows scared ghost-hit',
        },
        () => {
          harness.ghostPacmanCollisionSystem.update();
          expect(getGameState().lives).toBe(3);
          expect(getGameState().score).toBe(0);

          ghost.state.scared = true;
          harness.movementRules.setEntityTile(ghost, collisionTile);
          harness.ghostPacmanCollisionSystem.update();
          expect(getGameState().lives).toBe(3);
          expect(getGameState().score).toBe(200);
        },
      );
    } finally {
      harness.destroy();
    }
  });

  it('MEC-LIFE-004 adjacent tile sprite overlap still resolves collision outcomes', () => {
    const scenario = getScenarioOrThrow('MEC-LIFE-004');
    resetGameState(0, 3);

    const harness = new MechanicsDomainHarness({
      seed: scenario.seed,
      fixture: 'default-map',
      ghostCount: 1,
      autoStartSystems: false,
    });

    try {
      const ghost = harness.world.ghosts[0];
      if (!ghost) {
        throw new Error('expected one ghost for adjacent overlap scenario');
      }

      harness.movementRules.setEntityTile(harness.world.pacman, { x: 23, y: 23 });
      harness.movementRules.setEntityTile(ghost, { x: 24, y: 23 });
      ghost.state.free = true;
      ghost.state.scared = false;

      harness.world.pacman.moved.x = 3;
      harness.world.pacman.moved.y = 0;
      harness.movementRules.syncEntityPosition(harness.world.pacman);

      ghost.moved.x = -3;
      ghost.moved.y = 0;
      harness.movementRules.syncEntityPosition(ghost);

      runMechanicsAssertion(
        {
          scenarioId: scenario.id,
          seed: scenario.seed,
          tick: harness.world.tick,
          inputTrace: [
            'place pacman and ghost on adjacent tiles',
            'offset both entities toward each other to overlap rendered sprite area',
            'run ghost-pacman collision update',
          ],
          snapshotWindow: [harness.snapshot()],
          assertion: 'adjacent tiles still collide when sprite masks overlap in world space',
        },
        () => {
          harness.ghostPacmanCollisionSystem.update();
          expect(getGameState().lives).toBe(2);
        },
      );
    } finally {
      harness.destroy();
    }
  });
});
