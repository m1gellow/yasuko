import { GameState } from '../contexts/game';

// Common types used throughout the application
export interface MainContentProps {
  activeTab: string;
  user: User;
  position: number;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  state: GameState;
  tapTarget: TapTarget;
  onRefillEnergy: () => void;
  onTap: (points: number) => void;
  onLevelUp: () => void;
  showCharacterCard: boolean;
  getRecommendations: () => Array<{
    type: string;
    message: string;
    priority: number;
  }>;
  onPurchase: (item: StoreItem) => void;
  onTabChange: (tab: string) => void;
  onToggleCharacterCard: () => void;
  showPurchaseNotification: boolean;
  lastPurchase: StoreItem | null;
  isTapAnimationActive: boolean;
}

export interface TabContentProps {
  activeTab: string;
  tabName: string;
  children: React.ReactNode;
}

export interface User {
  id: string;
  name: string;
  username: string;
  phone: number;
  level: number;
  energy: {
    current: number;
    max: number;
    replenishRate: number;
  };
  score: number;
  rating: number;
  maxRating: number;
  items: any[]; // или более конкретный тип
  achievements: any[]; // или более конкретный тип
  lastActive: Date;
  dailyLoginDay: number;
  position?: number;
  telegram_id?: number;
  avatar_url?: string | null;
  promo_codes_used?: Record<string, boolean> | null;
}

export interface UserItem {
  id: string;
  name: string;
  itemId: string;
  level: number;
  isActive: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  isCompleted: boolean;
  progress: number;
  goal: number;
  reward: Reward;
  completedAt?: Date;
}

export interface Reward {
  type: 'coins' | 'energy' | 'item' | 'booster';
  amount: number;
  itemId?: string;
}

export interface TapTarget {
  id: string;
  name: string;
  basePoints: number;
  image: string;
  level: number;
  requiredTaps: number;
  currentTaps: number;
  energy: number;
  state: 'sleeping' | 'active' | 'transitioning';
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  discountPercent?: number;
  originalPrice?: number;
  category: 'energy' | 'food' | 'boosters' | 'accessories' | 'games';
  duration?: string;
  effect?: string;
  isPermanent?: boolean;
  isNew?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  participants: number;
  prizePool: number;
  userPosition: number;
  requiredPosition: number;
  type: 'weekly' | 'monthly';
}

export interface Notification {
  id: string;
  type: 'achievement' | 'rating' | 'reward' | 'system' | 'message';
  title: string;
  message: string;
  icon?: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export interface GameResult {
  score: number;
  energyEarned: number;
  time: number;
}

// Telegram WebApp types
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramWebAppUser;
  auth_date?: number;
  hash?: string;
}
