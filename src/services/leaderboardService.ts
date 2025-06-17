import { storage } from '../utils/storage';
import { supabase } from '../lib/supabase';
import { atom } from 'jotai';

// Constants
const LEADERBOARD_STORAGE_KEY = 'app:leaderboard';
const CACHE_EXPIRY_MINUTES = 5; // 5 minutes

// Типы данных
export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  score: number;
  characterType: 'yasuko' | 'fishko';
  characterLevel: number;
  isOnline: boolean;
  lastActivity: string;
  rank: number;
  change: number;
  status?: string;
}

// Atoms для глобального состояния
export const leaderboardAtom = atom<LeaderboardUser[]>([]);
export const isLoadingLeaderboardAtom = atom<boolean>(false);
export const leaderboardErrorAtom = atom<string | null>(null);

// Моковые данные лидерборда для использования при ошибках
const MOCK_LEADERBOARD: LeaderboardUser[] = [
  {
    id: "user-1",
    name: "Александр К.",
    level: 5,
    score: 15670,
    characterType: 'yasuko',
    characterLevel: 5,
    isOnline: true,
    lastActivity: new Date().toISOString(),
    rank: 1,
    change: 0,
    status: "Король тапов!"
  },
  {
    id: "user-2", 
    name: "Екатерина С.",
    level: 4,
    score: 12340,
    characterType: 'fishko',
    characterLevel: 4,
    isOnline: false,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    rank: 2,
    change: 1,
    status: "В погоне за призами"
  },
  {
    id: "user-3",
    name: "Дмитрий В.",
    level: 3,
    score: 9870,
    characterType: 'yasuko',
    characterLevel: 3,
    isOnline: false,
    lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    rank: 3,
    change: -1,
    status: "Мой Ясуко самый красивый"
  }
];

export const leaderboardService = {
  /**
   * Получение топа пользователей
   */
  async getLeaderboard(limit: number = 100, forceRefresh: boolean = false): Promise<LeaderboardUser[]> {
    try {
      // Сначала проверяем кэш, если не требуется принудительное обновление
      if (!forceRefresh) {
        const cachedLeaderboard = storage.get<LeaderboardUser[]>(LEADERBOARD_STORAGE_KEY);
        if (cachedLeaderboard) {
          return cachedLeaderboard;
        }
      }

      // Если данных в кэше нет, запрашиваем из базы
      const { data: usersData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          total_clicks,
          last_login,
          created_at,
          avatar_url,
          status
        `)
        .order('total_clicks', { ascending: false })
        .limit(limit);

      if (userError) {
        console.error('Error fetching leaderboard users:', userError);
        // В случае ошибки возвращаем моковые данные
        return MOCK_LEADERBOARD;
      }

      // Если нет данных, возвращаем моковые данные
      if (!usersData || usersData.length === 0) {
        return MOCK_LEADERBOARD;
      }

      // Получаем ID всех пользователей
      const userIds = usersData.map(user => user.id);

      // Отдельно получаем данные по персонажам
      const { data: charactersData, error: characterError } = await supabase
        .from('character')
        .select('id, rating, mood, satiety')
        .in('id', userIds);

      if (characterError) {
        console.error('Error fetching character data:', characterError);
      }

      // Создаем словарь для быстрого доступа к данным персонажей
      const characterMap: Record<string, any> = {};
      if (charactersData) {
        charactersData.forEach(char => {
          characterMap[char.id] = char;
        });
      }

      // Преобразуем данные в нужный формат
      const leaderboard: LeaderboardUser[] = usersData.map((user, index) => {
        // Проверяем, онлайн ли пользователь (был активен в последние 30 минут)
        const lastActive = user.last_login ? new Date(user.last_login) : new Date(user.created_at);
        const isOnline = Date.now() - lastActive.getTime() < 30 * 60 * 1000;

        // Получаем данные персонажа, если они есть
        const character = characterMap[user.id];

        // Определяем тип персонажа на основе предпочтений пользователя
        // Это заглушка, в реальном приложении логика должна быть более сложной
        const characterType = Math.random() > 0.5 ? 'yasuko' : 'fishko';

        // Вычисляем уровень пользователя
        const userLevel = this.calculateLevel(user.total_clicks || 0);

        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar_url || '', // Используем avatar_url из таблицы users
          level: userLevel,
          score: user.total_clicks || 0,
          characterType: characterType,
          characterLevel: userLevel,
          isOnline: isOnline,
          lastActivity: lastActive.toISOString(),
          rank: index + 1,
          change: 0, // Нет данных для изменения ранга
          status: user.status || 'Привет, мир!' // Используем статус из базы данных
        };
      });

      // Сохраняем в кэш
      storage.set(LEADERBOARD_STORAGE_KEY, leaderboard, CACHE_EXPIRY_MINUTES);

      return leaderboard;
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      // В случае ошибки возвращаем моковые данные
      return MOCK_LEADERBOARD;
    }
  },

  /**
   * Получение позиции пользователя в рейтинге
   */
  async getUserRank(userId: string): Promise<number> {
    try {
      // Сначала проверяем локальный рейтинг из сохраненного лидерборда
      const cachedLeaderboard = storage.get<LeaderboardUser[]>(LEADERBOARD_STORAGE_KEY);
      if (cachedLeaderboard) {
        const userEntry = cachedLeaderboard.find(entry => entry.id === userId);
        if (userEntry) {
          return userEntry.rank;
        }
      }
      
      // Если в кэше не нашли, делаем запрос через RPC функцию
      try {
        const { data, error } = await supabase.rpc('get_user_rank', {
          user_id: userId
        });

        if (error) {
          console.error('Error fetching user rank via RPC:', error);
          // Попробуем использовать запасной метод
          return this.calculateUserRankFallback(userId);
        }

        return data || 0;
      } catch (rpcError) {
        console.error('RPC not available, using fallback:', rpcError);
        return this.calculateUserRankFallback(userId);
      }
    } catch (error) {
      console.error('Error in getUserRank:', error);
      return 0;
    }
  },

  /**
   * Запасной метод для расчета рейтинга пользователя
   */
  async calculateUserRankFallback(userId: string): Promise<number> {
    try {
      // Запрашиваем данные пользователей сортированные по кликам
      const { data: usersData, error } = await supabase
        .from('users')
        .select('id, total_clicks')
        .order('total_clicks', { ascending: false });

      if (error) {
        console.error('Error fetching users for rank calculation:', error);
        return 0;
      }
      
      // Находим позицию пользователя
      for (let i = 0; i < usersData.length; i++) {
        if (usersData[i].id === userId) {
          return i + 1;
        }
      }
      
      return 0; // Если пользователь не найден
    } catch (fallbackError) {
      console.error('Error in calculateUserRankFallback:', fallbackError);
      return 0;
    }
  },

  /**
   * Вспомогательный метод для расчета уровня на основе тапов
   */
  calculateLevel(clicks: number): number {
    if (clicks < 100) return 1;
    if (clicks < 500) return 2;
    if (clicks < 1000) return 3;
    if (clicks < 2000) return 4;
    if (clicks < 5000) return 5;
    return Math.floor(clicks / 1000) + 1;
  }
};