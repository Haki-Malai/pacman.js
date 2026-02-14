import { GameEvent, gameEvents, getGameState } from '../../../state/gameState';

export class HudOverlayAdapter {
  private readonly container: HTMLDivElement;
  private readonly scoreText: HTMLDivElement;
  private readonly livesText: HTMLDivElement;
  private readonly onScoreChanged: (_score: number) => void;
  private readonly onLivesChanged: (_lives: number) => void;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.left = '8px';
    this.container.style.top = '8px';
    this.container.style.zIndex = '9998';
    this.container.style.pointerEvents = 'none';
    this.container.style.color = '#ffffff';
    this.container.style.fontSize = '14px';
    this.container.style.fontFamily = 'monospace';

    this.scoreText = document.createElement('div');
    this.livesText = document.createElement('div');

    this.container.appendChild(this.scoreText);
    this.container.appendChild(this.livesText);

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
    this.scoreText.textContent = `Score: ${score}`;
  }

  private setLives(lives: number): void {
    this.livesText.textContent = `Lives: ${lives}`;
  }
}
