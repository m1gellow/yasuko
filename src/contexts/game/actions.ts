// Импортируем типы
import { GameState } from './types';

// Типы действий для редуктора
export type GameAction = 
  | { type: 'TAP', payload: number }
  | { type: 'REGEN_ENERGY', payload: number }
  | { type: 'RESET' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_NATURE' }
  | { type: 'EVOLVE' }
  | { type: 'SET_LEVEL', payload: number }
  | { type: 'UPDATE_PROFILE', payload: Partial<GameState['profile']> }
  | { type: 'UPDATE_CHARACTER', payload: { rating?: number; mood?: number; satiety?: number; } }
  | { type: 'SET_AVATAR', payload: string }
  | { type: 'SET_THOUGHT_STATUS', payload: string }
  | { type: 'FEED_PET' }
  | { type: 'PLAY_WITH_PET' }
  | { type: 'CLAIM_REWARD', payload: { type: string, amount: number } }
  | { type: 'TOGGLE_CHARACTER' }
  | { type: 'BUY_ITEM', payload: { price: number } }
  | { type: 'APPLY_BUFF', payload: { type: 'coin' | 'energy', multiplier: number, duration: number } }
  | { type: 'SYNC_WITH_SERVER' }
  | { type: 'UPDATE_ENERGY_MAX', payload: number }
  | { type: 'UPDATE_RANKING', payload: { position: number } }
  | { type: 'RESET_DAILY_TASKS', payload: { tapTarget: number, tapProgress: number, completedToday: boolean, lastReset: number } }
  | { type: 'SET_USER_ID', payload: string };

// Создадим action creators для основных действий
export const tapAction = (points: number): GameAction => ({
  type: 'TAP',
  payload: points
});

export const regenEnergyAction = (amount: number): GameAction => ({
  type: 'REGEN_ENERGY',
  payload: amount
});

export const evolveAction = (): GameAction => ({
  type: 'EVOLVE'
});

export const setLevelAction = (level: number): GameAction => ({
  type: 'SET_LEVEL',
  payload: level
});

export const updateProfileAction = (updates: Partial<GameState['profile']>): GameAction => ({
  type: 'UPDATE_PROFILE',
  payload: updates
});

export const updateCharacterAction = (updates: { rating?: number; mood?: number; satiety?: number }): GameAction => ({
  type: 'UPDATE_CHARACTER',
  payload: updates
});

export const setAvatarAction = (avatarUrl: string): GameAction => ({
  type: 'SET_AVATAR',
  payload: avatarUrl
});

export const setThoughtStatusAction = (status: string): GameAction => ({
  type: 'SET_THOUGHT_STATUS',
  payload: status
});

export const feedPetAction = (): GameAction => ({
  type: 'FEED_PET'
});

export const playWithPetAction = (): GameAction => ({
  type: 'PLAY_WITH_PET'
});

export const claimRewardAction = (type: string, amount: number): GameAction => ({
  type: 'CLAIM_REWARD',
  payload: { type, amount }
});

export const toggleCharacterAction = (): GameAction => ({
  type: 'TOGGLE_CHARACTER'
});

export const buyItemAction = (price: number): GameAction => ({
  type: 'BUY_ITEM',
  payload: { price }
});

export const updateEnergyMaxAction = (newMax: number): GameAction => ({
  type: 'UPDATE_ENERGY_MAX',
  payload: newMax
});

export const updateRankingAction = (position: number): GameAction => ({
  type: 'UPDATE_RANKING',
  payload: { position }
});

export const resetDailyTasksAction = (data: { tapTarget: number, tapProgress: number, completedToday: boolean, lastReset: number }): GameAction => ({
  type: 'RESET_DAILY_TASKS',
  payload: data
});

export const setUserIdAction = (userId: string): GameAction => ({
  type: 'SET_USER_ID',
  payload: userId
});