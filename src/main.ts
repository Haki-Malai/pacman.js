import './tailwind.css';
import './style.css';
import { createPacmanGame } from './game/app/createPacmanGame';
import { resolveMapVariantFromEnv } from './game/app/mapRuntimeConfig';

const game = createPacmanGame({
  mountId: 'game-root',
  mapVariant: resolveMapVariantFromEnv(import.meta.env.VITE_GAME_ENV),
});

void game.start();
