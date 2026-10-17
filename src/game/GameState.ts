import { GameStateId } from '../types/GameTypes';

const ALLOWED: Record<GameStateId, GameStateId[]> = {
  [GameStateId.MENU]: [GameStateId.LEVEL_SELECT, GameStateId.SETTINGS, GameStateId.PLAYING],
  [GameStateId.LEVEL_SELECT]: [GameStateId.MENU, GameStateId.PLAYING, GameStateId.SETTINGS],
  [GameStateId.PLAYING]: [GameStateId.PLAYING, GameStateId.PAUSED, GameStateId.LEVEL_COMPLETE, GameStateId.GAME_OVER, GameStateId.LEVEL_SELECT, GameStateId.MENU],
  [GameStateId.PAUSED]: [GameStateId.PLAYING, GameStateId.SETTINGS, GameStateId.LEVEL_SELECT, GameStateId.MENU],
  [GameStateId.LEVEL_COMPLETE]: [GameStateId.PLAYING, GameStateId.LEVEL_SELECT, GameStateId.MENU],
  [GameStateId.GAME_OVER]: [GameStateId.PLAYING, GameStateId.LEVEL_SELECT, GameStateId.MENU],
  [GameStateId.SETTINGS]: [GameStateId.MENU, GameStateId.LEVEL_SELECT, GameStateId.PAUSED],
};

/** App-wide state machine. Scenes ask `is(...)` instead of keeping their own flags. */
export class GameStateMachine {
  private current: GameStateId = GameStateId.MENU;
  private listeners: ((to: GameStateId, from: GameStateId) => void)[] = [];

  get state(): GameStateId {
    return this.current;
  }

  is(s: GameStateId): boolean {
    return this.current === s;
  }

  /** Transitions are validated; an unexpected one is logged but never blocks the game. */
  set(next: GameStateId): void {
    const prev = this.current;
    if (prev !== next && !ALLOWED[prev].includes(next)) console.warn(`[state] unexpected transition ${prev} -> ${next}`);
    this.current = next;
    if (prev !== next) for (const l of this.listeners) l(next, prev);
  }

  onChange(fn: (to: GameStateId, from: GameStateId) => void): void {
    this.listeners.push(fn);
  }
}

export const appState = new GameStateMachine();
