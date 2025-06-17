import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

// Константы
const USER_PROGRESS_STORAGE_KEY = 'app:userProgress';
const CACHE_EXPIRY_MINUTES = 5; // 5 минут

// Типы данных для прогресса
export interface UserProgress {
  totalTaps: number;
  feedCount: number;
  petCount: number;
  dailyTasks: {
    tapTarget: number;
    tapProgress: number;
    completedToday: boolean;
    lastReset: number;
  };
  goals: {
    level: { current: number, target: number };
    ranking: { current: number, target: number };
    coins: { current: number, target: number };
  };
  growth: {
    tapsPerDay: number[];
    coinsEarned: number[];
    avgTaps: number;
    avgCoins: number;
  };
  achievements: {
    totalTaps: { completed: boolean, progress: number, target: number };
    coins: { completed: boolean, progress: number, target: number };
    feed: { completed: boolean, progress: number, target: number };
    pet: { completed: boolean, progress: number, target: number };
  };
}

export const userProgressService = {
  /**
   * Получение прогресса пользователя из Supabase
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      // Сначала проверяем кэш
      const cacheKey = `${USER_PROGRESS_STORAGE_KEY}:${userId}`;
      const cachedProgress = storage.get<UserProgress>(cacheKey);
      if (cachedProgress) {
        return cachedProgress;
      }
      
      // Получаем данные пользователя
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('total_clicks, feed_clicks, pet_clicks, status')
        .eq('id', userId)
        .maybeSingle(); // Используем maybeSingle вместо single
      
      if (userError) {
        console.error('Ошибка при получении данных пользователя:', userError);
        return this.getDefaultProgress();
      }
      
      // Проверяем, что данные существуют
      if (!userData) {
        console.warn('Данные пользователя не найдены:', userId);
        return this.getDefaultProgress();
      }
      
      // Получаем данные персонажа
      const { data: characterData, error: characterError } = await supabase
        .from('character')
        .select('rating')
        .eq('id', userId)
        .maybeSingle(); // Используем maybeSingle вместо single
        
      if (characterError) {
        console.error('Ошибка при получении данных персонажа:', characterError);
      }
      
      // Получаем ранг пользователя
      const { data: rankData, error: rankError } = await supabase
        .rpc('get_user_rank', { user_id: userId });
        
      if (rankError) {
        console.error('Ошибка при получении ранга пользователя:', rankError);
      }
      
      // Получаем статистику действий пользователя за последние 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('action, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', sevenDaysAgo.toISOString())
        .order('timestamp', { ascending: true });
        
      if (statsError) {
        console.error('Ошибка при получении статистики действий:', statsError);
      }
      
      // Обрабатываем статистику по дням
      const tapsPerDay = Array(7).fill(0);
      const coinsEarned = Array(7).fill(0);
      
      if (statsData && statsData.length > 0) {
        statsData.forEach(stat => {
          const date = new Date(stat.timestamp);
          const dayIndex = 6 - Math.min(6, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
          
          if (stat.action === 'click') {
            tapsPerDay[dayIndex]++;
            coinsEarned[dayIndex]++;
          }
        });
      }
      
      // Вычисляем средние значения
      const avgTaps = Math.round(tapsPerDay.reduce((sum, val) => sum + val, 0) / 7);
      const avgCoins = Math.round(coinsEarned.reduce((sum, val) => sum + val, 0) / 7);
      
      // Проверяем достижения
      const totalTaps = userData?.total_clicks || 0;
      const feedCount = userData?.feed_clicks || 0;
      const petCount = userData?.pet_clicks || 0;
      const coins = totalTaps; // В этом приложении монеты = кликам
      
      const achievements = {
        totalTaps: { completed: totalTaps >= 1000, progress: totalTaps, target: 1000 },
        coins: { completed: coins >= 5000, progress: coins, target: 5000 },
        feed: { completed: feedCount >= 50, progress: feedCount, target: 50 },
        pet: { completed: petCount >= 30, progress: petCount, target: 30 }
      };
      
      // Собираем все данные в объект
      const progress: UserProgress = {
        totalTaps,
        feedCount,
        petCount,
        dailyTasks: {
          tapTarget: 100, 
          tapProgress: Math.min(totalTaps % 100, 100), 
          completedToday: (totalTaps % 100) >= 100,
          lastReset: Date.now() - (Date.now() % (24 * 60 * 60 * 1000))
        },
        goals: {
          level: { 
            current: Math.floor(totalTaps / 200) + 1, 
            target: Math.floor(totalTaps / 200) + 2 
          },
          ranking: { 
            current: rankData || 99, 
            target: 20 
          },
          coins: { 
            current: coins, 
            target: 5000 
          }
        },
        growth: {
          tapsPerDay,
          coinsEarned,
          avgTaps,
          avgCoins
        },
        achievements
      };
      
      // Сохраняем статистику роста в базу данных
      this.saveGrowthStats(userId, tapsPerDay, coinsEarned);
      
      // Сохраняем в кэш
      storage.set(cacheKey, progress, CACHE_EXPIRY_MINUTES);
      
      return progress;
    } catch (error) {
      console.error('Ошибка в getUserProgress:', error);
      return this.getDefaultProgress();
    }
  },
  
  /**
   * Сохранение статистики роста в базу данных
   */
  async saveGrowthStats(userId: string, tapsPerDay: number[], coinsEarned: number[]): Promise<void> {
    try {
      // Сохраняем данные о статистике роста в базу данных
      const today = new Date();
      
      // Создаем запись для сегодняшней статистики
      await supabase.from('user_stats').insert({
        user_id: userId,
        action: 'growth_stats',
        timestamp: today.toISOString(),
        // Используем data поле для хранения подробной статистики
        data: {
          date: today.toISOString().split('T')[0],
          tapsPerDay,
          coinsEarned,
          avgTaps: Math.round(tapsPerDay.reduce((sum, val) => sum + val, 0) / 7),
          avgCoins: Math.round(coinsEarned.reduce((sum, val) => sum + val, 0) / 7)
        }
      }).maybeSingle();
      
    } catch (error) {
      console.error('Ошибка при сохранении статистики роста:', error);
    }
  },
  
  /**
   * Обновление прогресса пользователя в Supabase
   */
  async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<boolean> {
    try {
      // Обновляем только то, что можно обновить в наших таблицах
      if (updates.totalTaps !== undefined) {
        await supabase
          .from('users')
          .update({ total_clicks: updates.totalTaps })
          .eq('id', userId);
      }
      
      if (updates.feedCount !== undefined) {
        await supabase
          .from('users')
          .update({ feed_clicks: updates.feedCount })
          .eq('id', userId);
      }
      
      if (updates.petCount !== undefined) {
        await supabase
          .from('users')
          .update({ pet_clicks: updates.petCount })
          .eq('id', userId);
      }
      
      // Очищаем кэш
      const cacheKey = `${USER_PROGRESS_STORAGE_KEY}:${userId}`;
      storage.remove(cacheKey);
      
      return true;
    } catch (error) {
      console.error('Ошибка в updateUserProgress:', error);
      return false;
    }
  },

  /**
   * Выполнение ежедневного задания
   */
  async completeDailyTask(userId: string, taskId: string): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      
      // Записываем выполнение задачи
      await supabase
        .from('user_stats')
        .insert([
          {
            user_id: userId,
            action: `task_complete:${taskId}`,
            timestamp
          }
        ]);
        
      // Добавляем награду за задание (например, 50 монет)
      await supabase
        .from('users')
        .update({ total_clicks: supabase.rpc('increment', { value: 50 }) })
        .eq('id', userId);
      
      // Очищаем кэш
      const cacheKey = `${USER_PROGRESS_STORAGE_KEY}:${userId}`;
      storage.remove(cacheKey);
      
      return true;
    } catch (error) {
      console.error('Ошибка в completeDailyTask:', error);
      return false;
    }
  },
  
  /**
   * Анализ данных тапов и монет с помощью TensorFlow.js
   * Сохраняет результат в БД для отображения пользователю
   */
  async analyzeUserData(userId: string, tapData: number[], coinData: number[]): Promise<string> {
    try {
      // В реальном приложении здесь был бы запрос к API для анализа данных
      // или использование TensorFlow.js для локального анализа
      
      // Для демонстрации мы создаем простой анализ на основе данных
      const tapTrend = tapData.slice(-3).reduce((a, b) => a + b, 0) - 
                       tapData.slice(0, 3).reduce((a, b) => a + b, 0);
                       
      const coinTrend = coinData.slice(-3).reduce((a, b) => a + b, 0) -
                       coinData.slice(0, 3).reduce((a, b) => a + b, 0);
      
      let analysisText = '';
      
      if (tapTrend > 0) {
        analysisText += 'Отличная динамика тапов! Продолжайте в том же духе.\n';
      } else if (tapTrend === 0) {
        analysisText += 'Стабильная активность тапов.\n';
      } else {
        analysisText += 'Снижение активности тапов. Попробуйте тапать чаще для лучшего роста.\n';
      }
      
      if (coinTrend > 0) {
        analysisText += 'Эффективное накопление монет. Рассмотрите инвестиции в улучшения.';
      } else if (coinTrend === 0) {
        analysisText += 'Стабильный баланс монет. Хорошее управление ресурсами.';
      } else {
        analysisText += 'Расходы монет превышают доходы. Рекомендуется оптимизировать накопление.';
      }
      
      // Сохраняем результаты анализа
      const timestamp = new Date().toISOString();
      await supabase
        .from('user_stats')
        .insert([
          {
            user_id: userId,
            action: 'ai_analysis',
            timestamp
          }
        ]);
        
      // Формируем дополнительные рекомендации на основе статистики
      const totalTaps = tapData.reduce((sum, val) => sum + val, 0);
      if (totalTaps > 0) {
        const lastDayTaps = tapData[tapData.length - 1];
        const averageTaps = totalTaps / tapData.length;
        
        if (lastDayTaps > averageTaps * 1.5) {
          analysisText += '\n\nВы значительно превысили свой средний показатель тапов сегодня! Отличная работа!';
        } else if (lastDayTaps < averageTaps * 0.5) {
          analysisText += '\n\nСегодня вы тапаете меньше обычного. Попробуйте установить ежедневную цель.';
        }
      }
      
      return analysisText;
    } catch (error) {
      console.error('Ошибка в analyzeUserData:', error);
      return 'Не удалось выполнить анализ данных. Пожалуйста, попробуйте позже.';
    }
  },

  /**
   * Получение дефолтного прогресса для случаев ошибок
   */
  getDefaultProgress(): UserProgress {
    return {
      totalTaps: 0,
      feedCount: 0,
      petCount: 0,
      dailyTasks: {
        tapTarget: 100,
        tapProgress: 0,
        completedToday: false,
        lastReset: Date.now()
      },
      goals: {
        level: { current: 1, target: 2 },
        ranking: { current: 99, target: 20 },
        coins: { current: 0, target: 5000 }
      },
      growth: {
        tapsPerDay: [0, 0, 0, 0, 0, 0, 0],
        coinsEarned: [0, 0, 0, 0, 0, 0, 0],
        avgTaps: 0,
        avgCoins: 0
      },
      achievements: {
        totalTaps: { completed: false, progress: 0, target: 1000 },
        coins: { completed: false, progress: 0, target: 5000 },
        feed: { completed: false, progress: 0, target: 50 },
        pet: { completed: false, progress: 0, target: 30 }
      }
    };
  }
};