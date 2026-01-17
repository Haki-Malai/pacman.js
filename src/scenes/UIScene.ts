import Phaser from 'phaser';
import { GameEvent, gameEvents, getGameState } from '../state/gameState';

export default class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UI' });
  }

  create(): void {
    const { score, lives } = getGameState();

    this.scoreText = this.add
      .text(8, 8, `Score: ${score}`, {
        color: '#ffffff',
        fontSize: '14px',
      })
      .setScrollFactor(0);
    this.livesText = this.add
      .text(8, 26, `Lives: ${lives}`, {
        color: '#ffffff',
        fontSize: '14px',
      })
      .setScrollFactor(0);

    gameEvents.on(GameEvent.ScoreChanged, this.handleScoreChanged, this);
    gameEvents.on(GameEvent.LivesChanged, this.handleLivesChanged, this);

    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      gameEvents.off(GameEvent.ScoreChanged, this.handleScoreChanged, this);
      gameEvents.off(GameEvent.LivesChanged, this.handleLivesChanged, this);
    });
  }

  private handleScoreChanged = (score: number): void => {
    this.scoreText.setText(`Score: ${score}`);
  };

  private handleLivesChanged = (lives: number): void => {
    this.livesText.setText(`Lives: ${lives}`);
  };
}
