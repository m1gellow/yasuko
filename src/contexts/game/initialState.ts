import { GameState } from './types';

// Начальное состояние игры
export const initialGameState: GameState = {
  energy: {
    current: 100,
    max: 100,
    regenRate: 1/3, // Изменено: 1 единица энергии за 3 минуты
  },
  level: {
    current: 1,
    max: 10,
  },
  progress: {
    current: 25,
    required: 200,
  },
  coins: 25,
  name: 'Тестовый Пользователь',
  settings: {
    soundEnabled: true,
    natureEnabled: false,
  },
  profile: {
    avatar: '',
    age: 0,
    gender: 'other',
    mood: 'Счастливый',
    status: 'Новичок',
    thoughtStatus: 'Привет, мир!',
    hunger: 70,
    happiness: 80,
    health: 90,
    lastFed: Date.now(),
    customFields: {},
  },
  characterType: 'yasuko',
  fishko: {
    lifeForce: 80,
    mood: 75,
    happiness: 80,
    fedCount: 0,
    lastFedTime: Date.now(),
    pettedCount: 0,
  },
  dailyTasks: {
    tapTarget: 100,
    tapProgress: 0,
    completedToday: false,
    lastReset: Date.now(),
  },
  achievements: {
    totalTaps: 0,
    consecutiveLogins: 1,
    itemsBought: 0,
    feedCount: 0,
    lastRewards: {},
  },
  ranking: {
    position: 99,
    weeklyTaps: 0,
    bestPosition: 99,
    lastCompetitionReward: 0,
  },
  growthHistory: {
    coinsEarned: [0,0,0,0,0,0,0],
    tapsPerDay: [0,0,0,0,0,0,0],
  },
  tempBuffs: {
    coinMultiplier: 1,
    energyBuff: 0,
  },
};