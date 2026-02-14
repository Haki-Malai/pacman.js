import { GameCompositionOptions, GameCompositionRoot } from './GameCompositionRoot';
import { GameRuntime } from './GameRuntime';
import { PacmanGame } from './contracts';

let activeGame: PacmanGame | null = null;

export type CreatePacmanGameOptions = GameCompositionOptions;

export function createPacmanGame(options: CreatePacmanGameOptions = {}): PacmanGame {
  activeGame?.destroy();

  const runtime = new GameRuntime(new GameCompositionRoot(options));

  const game: PacmanGame = {
    start: () => runtime.start(),
    pause: () => runtime.pause(),
    resume: () => runtime.resume(),
    destroy: () => {
      runtime.destroy();
      if (activeGame === game) {
        activeGame = null;
      }
    },
  };

  activeGame = game;
  return game;
}
