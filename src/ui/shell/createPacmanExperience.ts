import { createPacmanGame } from '../../game/app/createPacmanGame';
import type { GameCompositionOptions } from '../../game/app/GameCompositionRoot';
import { PacmanExperience } from './contracts';
import { PacmanExperienceRuntime } from './PacmanExperienceRuntime';

export type CreatePacmanExperienceOptions = GameCompositionOptions & {
    autoStart?: boolean;
};

export function createPacmanExperience(
    options: CreatePacmanExperienceOptions = {}
): PacmanExperience {
    const { mountId, rng, autoStart = import.meta.env.DEV } = options;

    return new PacmanExperienceRuntime({
        mountId,
        autoStart,
        createGame: ({ mountId: runtimeMountId }) =>
            createPacmanGame({
                mountId: runtimeMountId,
                rng,
            }),
    });
}
