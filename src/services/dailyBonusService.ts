import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

// Константы
const DAILY_BONUS_STORAGE_KEY = 'app:dailyBonus';
const CACHE_EXPIRY_MINUTES = 5; // 5 минут

// Типы данных для ежедневных бонусов
export interface DailyBonusInfo {
  dayNumber: number;
  streak: number;
  lastClaimed: string;
  canClaim: boolean;
}

export interface DailyBonusResult {
  success: boolean;
  message: string;
  amount?: number;
  dayNumber?: number;
  streak?: number;
}

export const dailyBonusService = {
  /**
   * Получение информации о ежедневных бонусах пользователя
   */
  async getUserDailyBonusInfo(userId: string): Promise<DailyBonusInfo | null> {
    try {
      // Сначала проверяем кэш
      const cacheKey = `${DAILY_BONUS_STORAGE_KEY}:${userId}`;
      const cachedInfo = storage.get<DailyBonusInfo>(cacheKey);
      if (cachedInfo) {
        return cachedInfo;
      }

      // Получаем информацию о бонусах через RPC
      const { data, error } = await supabase.rpc('get_user_daily_bonuses', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching daily bonus info:', error);
        // Возвращаем значения по умолчанию в случае ошибки
        return {
          dayNumber: 1,
          streak: 1,
          lastClaimed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          canClaim: true
        };
      }

      if (!data) {
        // Если данные не получены, возвращаем значения по умолчанию
        return {
          dayNumber: 1,
          streak: 1,
          lastClaimed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          canClaim: true
        };
      }

      const bonusInfo: DailyBonusInfo = {
        dayNumber: data.day_number || 1,
        streak: data.streak || 1,
        lastClaimed: data.last_claimed || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        canClaim: data.can_claim
      };

      // Сохраняем в кэш на короткое время
      storage.set(cacheKey, bonusInfo, CACHE_EXPIRY_MINUTES);

      return bonusInfo;
    } catch (error) {
      console.error('Error in getUserDailyBonusInfo:', error);
      // Возвращаем стандартное значение при ошибке
      return {
        dayNumber: 1,
        streak: 1,
        lastClaimed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        canClaim: true
      };
    }
  },

  /**
   * Получение ежедневного бонуса
   */
  async claimDailyBonus(userId: string): Promise<DailyBonusResult> {
    try {
      // Напрямую создаем запись в таблице daily_bonuses
      const today = new Date();
      const dayNumber = 1; // Начинаем с 1 для первого дня
      const bonusAmount = 50; // Базовый бонус

      const { data, error } = await supabase
        .from('daily_bonuses')
        .insert({
          user_id: userId,
          day_number: dayNumber,
          reward_amount: bonusAmount
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return {
            success: false,
            message: 'Вы уже получили бонус сегодня',
          };
        }
        console.error('Error claiming daily bonus:', error);
        return {
          success: false,
          message: 'Ошибка при получении бонуса',
        };
      }

      // Очищаем кэш информации о бонусах
      const cacheKey = `${DAILY_BONUS_STORAGE_KEY}:${userId}`;
      storage.remove(cacheKey);

      return {
        success: true,
        message: 'Бонус успешно получен!',
        amount: bonusAmount,
        dayNumber: dayNumber,
        streak: 1,
      };
    } catch (error) {
      console.error('Error in claimDailyBonus:', error);
      return {
        success: false,
        message: 'Произошла ошибка при получении ежедневного бонуса',
      };
    }
  },

  /**
   * Получение информации о следующем бонусе
   */
  getNextBonusAmount(dayNumber: number): number {
    // Вычисляем сумму бонуса (каждые 7 дней бонус удваивается)
    if (dayNumber % 7 === 0) {
      return 200 * (dayNumber / 7);
    } else {
      return 50 + (dayNumber - 1) * 25;
    }
  },

  /**
   * Проверка, является ли день "большим бонусом" (каждый 7 день)
   */
  isBigBonusDay(dayNumber: number): boolean {
    return dayNumber % 7 === 0;
  },
};