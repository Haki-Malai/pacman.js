import Phaser from 'phaser';

export type GameState = {
  score: number;
  lives: number;
};

export const GameEvent = {
  ScoreChanged: 'score-changed',
  LivesChanged: 'lives-changed',
} as const;

const state: GameState = {
  score: 0,
  lives: 3,
};

export const gameEvents = new Phaser.Events.EventEmitter();

export function resetGameState(initialScore = 0, initialLives = 3): void {
  state.score = initialScore;
  state.lives = initialLives;
  gameEvents.emit(GameEvent.ScoreChanged, state.score);
  gameEvents.emit(GameEvent.LivesChanged, state.lives);
}

export function addScore(amount: number): void {
  state.score += amount;
  gameEvents.emit(GameEvent.ScoreChanged, state.score);
}

export function setLives(lives: number): void {
  state.lives = lives;
  gameEvents.emit(GameEvent.LivesChanged, state.lives);
}

export function getGameState(): GameState {
  return { ...state };
}
