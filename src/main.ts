import './style.css';
import { createPacmanExperience } from './ui/shell/createPacmanExperience';

const experience = createPacmanExperience({
    mountId: 'game-root',
});

void experience.start();
