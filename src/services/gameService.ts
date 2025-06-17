import { storage } from '../utils/storage';
import { supabase, Character, UserStat } from '../lib/supabase';
import { atom } from 'jotai';
import { GameState } from '../contexts/GameContext';

// Constants
const GAME_STATE_STORAGE_KEY = 'app:gameState';
const CHARACTER_STORAGE_KEY = 'app:character';
const CACHE_EXPIRY_MINUTES = 30; // 30 minutes

// Atoms for global state
export const characterAtom = atom<Character | null>(null);
export const isLoadingGameDataAtom = atom<boolean>(false);
export const gameErrorAtom = atom<string | null>(null);

export const gameService = {
  /**
   * Получение данных персонажа с приоритетом кэша
   */
  async getCharacter(userId: string): Promise<Character | null> {
    try {
      console.log('Getting character for user:', userId);
      
      // Проверяем кэш
      const cacheKey = `character_${userId}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      // Если данные в кэше не старше 5 минут, используем их
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 минут
            console.log('Character loaded from cache:', data);
            return data;
          }
        } catch (e) {
          console.error('Error parsing cached character data:', e);
        }
      }
      
      // Если в кэше нет, пытаемся получить из Supabase
      const { data, error } = await supabase
        .from('character')
        .select('*')
        .eq('id', userId) // Предполагается, что id персонажа совпадает с id пользователя
        .maybeSingle(); // Изменено с .limit(1).single() на .maybeSingle()

      if (error) {
        console.error('Error fetching character:', error);
        return null;
      }

      // Проверяем, есть ли данные
      if (data) {
        console.log('Character loaded from DB:', data);
        
        // Сохраняем в кэш
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        return data;
      } else {
        console.log('No character data found for user:', userId);
        return null;
      }
    } catch (error) {
      console.error('Error in getCharacter:', error);
      return null;
    }
  },

  /**
   * Обновление данных персонажа
   */
  async updateCharacter(characterId: string, data: Partial<Character>): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log('Updating character:', characterId, data);
      
      // Получаем текущую сессию, чтобы убедиться, что пользователь авторизован
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.error('User not authenticated:', sessionError);
        return { success: false, error: 'Пользователь не авторизован' };
      }
      
      // Получаем ID текущего пользователя
      const userId = sessionData.session.user.id;
      
      // Логируем различия, но не блокируем операцию
      if (userId !== characterId) {
        console.warn('User ID does not match character ID:', userId, characterId);
      }
      
      // Пытаемся найти персонажа
      const { data: characterData, error: characterError } = await supabase
        .from('character')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      // Определяем, какой ID использовать для обновления
      const idToUpdate = characterData ? userId : characterId;
      
      // Обновляем данные персонажа
      const { error } = await supabase
        .from('character')
        .update(data)
        .eq('id', idToUpdate);

      if (error) {
        console.error('Error updating character:', error);
        return { success: false, error: error.message };
      }

      // Обновляем кэш
      const cacheKey = `character_${characterId}`;
      const cachedDataString = localStorage.getItem(cacheKey);
      
      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString);
          const updatedCharacter = { ...cachedData.data, ...data };
          
          localStorage.setItem(cacheKey, JSON.stringify({
            data: updatedCharacter,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Error updating character cache:', e);
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in updateCharacter:', error);
      return { success: false, error: 'Произошла ошибка при обновлении персонажа' };
    }
  },

  /**
   * Сохранение игрового состояния в локальное хранилище
   */
  saveGameState(state: GameState): void {
    storage.set(GAME_STATE_STORAGE_KEY, state);
  },

  /**
   * Загрузка игрового состояния из локального хранилища
   */
  loadGameState(): GameState | null {
    return storage.get<GameState>(GAME_STATE_STORAGE_KEY);
  },

  /**
   * Запись действия пользователя в статистику
   */
  async recordUserAction(userId: string, action: 'click' | 'feed' | 'pet' | 'idle'): Promise<void> {
    try {
      // Получаем текущую сессию, чтобы убедиться, что пользователь авторизован
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.error('User not authenticated:', sessionError);
        return;
      }
      
      // Получаем ID текущего пользователя
      const authenticatedUserId = sessionData.session.user.id;
      
      // Логируем различия, но не блокируем операцию
      if (authenticatedUserId !== userId) {
        console.warn('User ID does not match authenticated user ID:', userId, authenticatedUserId);
      }

      // Используем функцию track_user_action вместо прямой вставки
      // Используем только один порядок параметров: p_user_id, p_action, p_details
      const { error } = await supabase.rpc('track_user_action', {
        p_user_id: authenticatedUserId,
        p_action: action,
        p_details: {}
      });

      if (error) {
        console.error('Error recording user action:', error);
        
        // Запасной вариант - прямая вставка в таблицу
        try {
          const { error: insertError } = await supabase
            .from('user_stats')
            .insert({
              user_id: authenticatedUserId,
              action: action,
              timestamp: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('Fallback insert failed:', insertError);
          }
        } catch (fallbackError) {
          console.error('Fallback insert failed:', fallbackError);
        }
      }

      // Также обновляем счетчики в таблице users
      const counterField = action === 'click' 
        ? 'total_clicks' 
        : action === 'feed' 
          ? 'feed_clicks' 
          : action === 'pet' 
            ? 'pet_clicks' 
            : null;

      if (counterField) {
        try {
          const { error: rpcError } = await supabase.rpc('increment_user_counter', { 
            user_id: authenticatedUserId, // Используем ID из сессии
            counter_name: counterField 
          });
          
          if (rpcError) {
            console.error('Error incrementing counter:', rpcError);
          } else {
            console.log('Counter incremented:', counterField);
          }
        } catch (counterError) {
          console.error('Error incrementing counter:', counterError);
        }
      }
    } catch (error) {
      console.error('Error in recordUserAction:', error);
    }
  },

  /**
   * Получение актуального уровня персонажа на основе рейтинга
   */
  async getLevelByRating(rating: number): Promise<number> {
    try {
      // Кэшируем уровни, так как они редко меняются
      const cachedLevels = storage.get<any[]>('app:levels');
      let levels;

      if (cachedLevels) {
        levels = cachedLevels;
      } else {
        const { data, error } = await supabase
          .from('levels')
          .select('*')
          .order('min_rating', { ascending: true });

        if (error) {
          console.error('Error fetching levels:', error);
          return 1; // Возвращаем уровень 1 по умолчанию
        }

        levels = data;
        // Кэшируем на 24 часа
        storage.set('app:levels', levels, 24 * 60);
      }

      // Ищем подходящий уровень
      for (let i = levels.length - 1; i >= 0; i--) {
        if (rating >= levels[i].min_rating) {
          return i + 1; // Уровни начинаются с 1
        }
      }

      return 1; // Возвращаем уровень 1 по умолчанию
    } catch (error) {
      console.error('Error in getLevelByRating:', error);
      return 1;
    }
  },

  /**
   * Получение случайной фразы по категории
   */
  async getRandomPhrase(category: 'click' | 'feed' | 'pet' | 'idle'): Promise<string> {
    try {
      // Кэшируем фразы по категориям
      const cacheKey = `app:phrases:${category}`;
      const cachedPhrases = storage.get<string[]>(cacheKey);
      let phrases;

      if (cachedPhrases) {
        phrases = cachedPhrases;
      } else {
        const { data, error } = await supabase
          .from('phrases')
          .select('text')
          .eq('category', category);

        if (error) {
          console.error('Error fetching phrases:', error);
          return 'Мне нечего сказать...';
        }

        phrases = data.map(item => item.text);
        // Кэшируем на 24 часа
        storage.set(cacheKey, phrases, 24 * 60);
      }

      if (!phrases || phrases.length === 0) {
        return 'Мне нечего сказать...';
      }

      // Выбираем случайную фразу
      const randomIndex = Math.floor(Math.random() * phrases.length);
      return phrases[randomIndex];
    } catch (error) {
      console.error('Error in getRandomPhrase:', error);
      return 'Произошла ошибка...';
    }
  },
  
  /**
   * Получение статистики пользователя
   */
  async getUserStats(userId: string): Promise<{ 
    totalClicks: number; 
    feedClicks: number; 
    petClicks: number; 
    lastActions: UserStat[];
  }> {
    try {
      // Получаем данные пользователя
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('total_clicks, feed_clicks, pet_clicks')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error('Error fetching user stats:', userError);
        return { totalClicks: 0, feedClicks: 0, petClicks: 0, lastActions: [] };
      }
      
      // Получаем последние действия пользователя
      const { data: actions, error: actionsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (actionsError) {
        console.error('Error fetching user actions:', actionsError);
        return { 
          totalClicks: userData.total_clicks || 0, 
          feedClicks: userData.feed_clicks || 0, 
          petClicks: userData.pet_clicks || 0,
          lastActions: []
        };
      }
      
      return {
        totalClicks: userData.total_clicks || 0,
        feedClicks: userData.feed_clicks || 0,
        petClicks: userData.pet_clicks || 0,
        lastActions: actions
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return { totalClicks: 0, feedClicks: 0, petClicks: 0, lastActions: [] };
    }
  },

  /**
   * Отслеживание действия пользователя через функцию track_user_action
   * @param userId ID пользователя
   * @param action Тип действия
   * @param details Дополнительные данные
   */
  async trackUserAction(userId: string, action: string, details: Record<string, any> = {}): Promise<void> {
    try {
      // Получаем текущую сессию для проверки авторизации
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.warn('User not authenticated. Action tracking skipped.');
        return;
      }
      
      // Вызываем RPC функцию track_user_action с четким порядком параметров:
      // 1. p_user_id - ID пользователя (всегда первый параметр)
      // 2. p_action - действие (всегда второй параметр)
      // 3. p_details - детали (всегда третий параметр)
      const { error } = await supabase.rpc('track_user_action', {
        p_user_id: userId,        // Всегда первый параметр
        p_action: action,         // Всегда второй параметр
        p_details: details        // Всегда третий параметр
      });

      if (error) {
        console.error('Error recording user action:', error);
        
        // Запасной вариант - прямая вставка в таблицу
        try {
          const { error: insertError } = await supabase
            .from('user_stats')
            .insert({
              user_id: userId,
              action: action === 'tap' ? 'click' : action, // преобразуем tap в click для совместимости
              data: details,
              timestamp: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('Fallback insert failed:', insertError);
          }
        } catch (fallbackError) {
          console.error('Fallback insert failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error in trackUserAction:', error);
    }
  },

  /**
   * Очистить весь кэш игровых данных
   */
  clearCache(): void {
    // Очистка всех кэшей, связанных с игрой
    try {
      const keysToRemove = [
        GAME_STATE_STORAGE_KEY,
        'app:levels',
        'app:leaderboard',
        'app:phrases:click',
        'app:phrases:feed',
        'app:phrases:pet',
        'app:phrases:idle'
      ];
      
      // Удаляем явно указанные ключи
      keysToRemove.forEach(key => storage.remove(key));
      
      // Удаляем все ключи, начинающиеся с 'character_'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('character_')) {
          localStorage.removeItem(key);
        }
      }
      
      console.log('Game cache cleared successfully');
    } catch (error) {
      console.error('Error clearing game cache:', error);
    }
  }
};