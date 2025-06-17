import { User, TapTarget, Tournament, Notification, Achievement } from '../types';

// Helper to generate dates relative to current date
const dateFrom = (days: number, hours = 0, minutes = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

// Mock current user
export const mockUser: User = {
  id: "user-1",
  name: "Тестовый Пользователь",
  username: "@test_user",
  level: 1,
  energy: {
    current: 100,
    max: 100,
    replenishRate: 1 // 1 energy per minute
  },
  score: 25,
  rating: 25,
  maxRating: 200,
  items: [],
  achievements: [],
  lastActive: new Date(),
  dailyLoginDay: 1
};

// Mock tap target (walnut)
export const mockTapTarget: TapTarget = {
  id: "target-1",
  name: "ОРЕХ",
  basePoints: 1,
  image: "/assets/oreh.png",
  level: 1,
  requiredTaps: 200,
  currentTaps: 25,
  energy: 1,
  state: "active"
};

// Mock tournaments
export const mockTournaments: Tournament[] = [
  {
    id: "tournament-1",
    name: "ЕЖЕНЕДЕЛЬНЫЙ ТУРНИР",
    description: "Сделайте больше тапов и войдите в топ-20 игроков недели, чтобы получить эксклюзивную награду и монеты.",
    startDate: dateFrom(-2),
    endDate: dateFrom(5, 13, 41),
    participants: 120,
    prizePool: 5000,
    userPosition: 25,
    requiredPosition: 20,
    type: "weekly"
  },
  {
    id: "tournament-2",
    name: "МЕСЯЧНОЕ СОРЕВНОВАНИЕ",
    description: "Примите участие в престижном ежемесячном турнире с крупным призовым фондом и редкими наградами.",
    startDate: dateFrom(-16),
    endDate: dateFrom(14, 13, 41),
    participants: 350,
    prizePool: 10000,
    userPosition: 48,
    requiredPosition: 50,
    type: "monthly"
  }
];

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "achievement",
    title: "Новое достижение",
    message: "Вы совершили 100 тапов! Получите награду в профиле.",
    icon: "trophy",
    isRead: false,
    createdAt: new Date()
  },
  {
    id: "notif-2",
    type: "rating",
    title: "Рейтинг улучшен",
    message: "Ваша позиция в рейтинге: #99",
    icon: "chart",
    isRead: false,
    createdAt: new Date()
  }
];

// Mock achievements
export const mockAchievements: Achievement[] = [
  {
    id: "achievement-1",
    title: "Первые шаги",
    description: "Совершите 100 тапов",
    icon: "tap",
    isCompleted: true,
    progress: 100,
    goal: 100,
    reward: { type: "coins", amount: 50 },
    completedAt: new Date()
  },
  {
    id: "achievement-2",
    title: "Постоянный игрок",
    description: "Войдите в игру 7 дней подряд",
    icon: "calendar",
    isCompleted: false,
    progress: 1,
    goal: 7,
    reward: { type: "coins", amount: 200 }
  },
  {
    id: "achievement-3",
    title: "Коллекционер",
    description: "Купите 5 предметов в магазине",
    icon: "shopping-bag",
    isCompleted: false,
    progress: 0,
    goal: 5,
    reward: { type: "energy", amount: 50 }
  }
];