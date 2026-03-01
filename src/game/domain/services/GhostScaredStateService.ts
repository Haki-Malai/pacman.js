import { GhostEntity } from '../entities/GhostEntity';
import { WorldState } from '../world/WorldState';

export function setGhostScaredWindow(world: WorldState, ghost: GhostEntity, durationMs: number): void {
  ghost.state.scared = true;
  world.ghostScaredTimers.set(ghost, durationMs);
  world.ghostScaredWarnings.delete(ghost);
}

export function clearGhostScaredWindow(world: WorldState, ghost: GhostEntity): void {
  ghost.state.scared = false;
  world.ghostScaredTimers.delete(ghost);
  world.ghostScaredWarnings.delete(ghost);
}

export function setActiveGhostsScaredWindow(world: WorldState, durationMs: number): void {
  world.ghosts.forEach((ghost) => {
    if (!ghost.active) {
      return;
    }

    setGhostScaredWindow(world, ghost, durationMs);
  });
}

export function clearAllGhostScaredWindow(world: WorldState): void {
  world.ghosts.forEach((ghost) => {
    clearGhostScaredWindow(world, ghost);
  });
}
