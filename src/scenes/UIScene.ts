import Phaser from 'phaser';
import type GameScene from './GameScene';

export default class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UI' });
  }

  create(): void {
    const gameScene = this.scene.get('Game') as GameScene;

    this.scoreText = this.add
      .text(8, 8, `Score: ${gameScene.getScore()}`, {
        color: '#ffffff',
        fontSize: '14px',
      })
      .setScrollFactor(0);
    this.livesText = this.add
      .text(8, 26, `Lives: ${gameScene.getLives()}`, {
        color: '#ffffff',
        fontSize: '14px',
      })
      .setScrollFactor(0);

    const scoreChangedEvent: string = 'score-changed';
    const livesChangedEvent: string = 'lives-changed';

    const events: Phaser.Events.EventEmitter = this.game.events;
    events.on(scoreChangedEvent, this.handleScoreChanged, this);
    events.on(livesChangedEvent, this.handleLivesChanged, this);

    const shutdownEvent = 'shutdown';
    this.events.once(shutdownEvent, () => {
      events.off(scoreChangedEvent, this.handleScoreChanged, this);
      events.off(livesChangedEvent, this.handleLivesChanged, this);
    });
  }

  private handleScoreChanged = (score: number): void => {
    this.scoreText.setText(`Score: ${score}`);
  };

  private handleLivesChanged = (lives: number): void => {
    this.livesText.setText(`Lives: ${lives}`);
  };
}
