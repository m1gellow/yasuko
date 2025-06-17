// Определение типа состояния игры
export interface GameState {
  energy: {
    current: number;
    max: number;
    regenRate: number;
  };
  level: {
    current: number;
    max: number;
  };
  progress: {
    current: number;
    required: number;
  };
  coins: number;
  name: string;
  settings: {
    soundEnabled: boolean;
    natureEnabled: boolean;
  };
  profile: {
    avatar: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    mood: string;
    status: string;
    thoughtStatus: string;
    hunger: number;
    happiness: number;
    health: number;
    lastFed: number;
    customFields: Record<string, string>;
  };
  characterType: 'yasuko' | 'fishko';
  fishko: {
    lifeForce: number;
    mood: number;
    happiness: number;
    fedCount: number;
    lastFedTime: number;
    pettedCount: number;
  };
  dailyTasks: {
    tapTarget: number;
    tapProgress: number;
    completedToday: boolean;
    lastReset: number;
  };
  achievements: {
    totalTaps: number;
    consecutiveLogins: number; 
    itemsBought: number;
    feedCount: number;
    lastRewards: Record<string, number>;
  };
  ranking: {
    position: number;
    weeklyTaps: number;
    bestPosition: number;
    lastCompetitionReward: number;
  };
  growthHistory: {
    coinsEarned: number[];
    tapsPerDay: number[];
  };
  tempBuffs: {
    coinMultiplier: number;
    energyBuff: number;
    coinBuffEndTime?: number;
    energyBuffEndTime?: number;
  };
  userId?: string; // Идентификатор пользователя для Supabase
}