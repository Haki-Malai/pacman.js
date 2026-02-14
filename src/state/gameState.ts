import { TypedEventEmitter } from '../engine/events';
import { INITIAL_LIVES } from '../config/constants';

export type GameState = {
  score: number;
  lives: number;
};

export const GameEvent = {
  ScoreChanged: 'score-changed',
  LivesChanged: 'lives-changed',
} as const;

type GameEventMap = {
  [GameEvent.ScoreChanged]: number;
  [GameEvent.LivesChanged]: number;
};

const state: GameState = {
  score: 0,
  lives: INITIAL_LIVES,
};

const eventBus = new TypedEventEmitter<GameEventMap>();

export const gameEvents = {
  on<K extends keyof GameEventMap>(event: K, listener: (_payload: GameEventMap[K]) => void): void {
    eventBus.on(event, listener);
  },
  off<K extends keyof GameEventMap>(event: K, listener: (_payload: GameEventMap[K]) => void): void {
    eventBus.off(event, listener);
  },
  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    eventBus.emit(event, payload);
  },
};

export function resetGameState(initialScore = 0, initialLives = INITIAL_LIVES): void {
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
