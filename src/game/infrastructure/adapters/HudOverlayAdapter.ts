import { GameEvent, gameEvents, getGameState } from '../../../state/gameState';

const BASE_LIFE_SLOT_COUNT = 3;

export class HudOverlayAdapter {
    private readonly container: HTMLDivElement;
    private readonly scoreText: HTMLDivElement;
    private readonly livesText: HTMLDivElement;
    private readonly livesIcons: HTMLDivElement;
    private readonly onScoreChanged: (_score: number) => void;
    private readonly onLivesChanged: (_lives: number) => void;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'pacman-hud-root';

        this.scoreText = document.createElement('div');
        this.scoreText.className = 'pacman-hud-label';

        const livesPanel = document.createElement('div');
        livesPanel.className = 'flex items-center gap-3';

        this.livesText = document.createElement('div');
        this.livesText.className = 'pacman-hud-label';

        this.livesIcons = document.createElement('div');
        this.livesIcons.className = 'pacman-hud-lives';

        livesPanel.append(this.livesText, this.livesIcons);
        this.container.append(this.scoreText, livesPanel);

        const state = getGameState();
        this.setScore(state.score);
        this.setLives(state.lives);

        this.onScoreChanged = (score: number) => {
            this.setScore(score);
        };

        this.onLivesChanged = (lives: number) => {
            this.setLives(lives);
        };

        gameEvents.on(GameEvent.ScoreChanged, this.onScoreChanged);
        gameEvents.on(GameEvent.LivesChanged, this.onLivesChanged);

        document.body.appendChild(this.container);
    }

    destroy(): void {
        gameEvents.off(GameEvent.ScoreChanged, this.onScoreChanged);
        gameEvents.off(GameEvent.LivesChanged, this.onLivesChanged);
        this.container.remove();
    }

    private setScore(score: number): void {
        this.scoreText.textContent = `Score ${score}`;
    }

    private setLives(lives: number): void {
        this.livesText.textContent = `Lives ${lives}`;
        this.renderLives(lives);
    }

    private renderLives(lives: number): void {
        const visibleLives = Math.max(0, lives);
        const slots = Math.max(BASE_LIFE_SLOT_COUNT, visibleLives);

        this.livesIcons.replaceChildren();

        for (let index = 0; index < slots; index += 1) {
            const icon = document.createElement('span');
            icon.className = 'pacman-hud-heart';
            icon.setAttribute('aria-hidden', 'true');

            if (index >= visibleLives) {
                icon.classList.add('pacman-hud-heart--empty');
            }

            this.livesIcons.append(icon);
        }
    }
}
