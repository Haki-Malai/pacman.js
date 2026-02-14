import './style.css';
import { createPacmanGame } from './game/app/createPacmanGame';

const game = createPacmanGame({
  mountId: 'game-root',
});

void game.start();
