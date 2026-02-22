import { createPacmanGame } from '../../game/app/createPacmanGame';
import type { GameCompositionOptions } from '../../game/app/GameCompositionRoot';
import { PacmanExperience } from './contracts';
import { PacmanExperienceRuntime } from './PacmanExperienceRuntime';

export type CreatePacmanExperienceOptions = GameCompositionOptions;

export function createPacmanExperience(
    options: CreatePacmanExperienceOptions = {}
): PacmanExperience {
    const { mountId, rng } = options;

    return new PacmanExperienceRuntime({
        mountId,
        createGame: ({ mountId: runtimeMountId }) =>
            createPacmanGame({
                mountId: runtimeMountId,
                rng,
            }),
    });
}
