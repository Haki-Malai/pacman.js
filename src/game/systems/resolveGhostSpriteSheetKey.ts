import { GHOST_SCARED_WARNING_DURATION_MS } from '../../config/constants';
import { GhostEntity } from '../domain/entities/GhostEntity';
import { WorldState } from '../domain/world/WorldState';

export type GhostSpriteSheetKey = GhostEntity['key'] | 'scared';

export function resolveGhostSpriteSheetKey(world: WorldState, ghost: GhostEntity): GhostSpriteSheetKey {
  if (!ghost.state.scared) {
    return ghost.key;
  }

  const remaining = world.ghostScaredTimers.get(ghost) ?? 0;
  if (remaining > 0 && remaining <= GHOST_SCARED_WARNING_DURATION_MS) {
    const warning = world.ghostScaredWarnings.get(ghost);
    if (warning?.showBaseColor) {
      return ghost.key;
    }
  }

  return 'scared';
}
