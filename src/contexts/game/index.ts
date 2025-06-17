// Основной файл для экспорта всех необходимых частей контекста

export { useGame, GameProvider } from './GameContext';
export type { GameState } from './types';
export { gameReducer } from './reducer';
export { initialGameState } from './initialState';
export * from './actions';