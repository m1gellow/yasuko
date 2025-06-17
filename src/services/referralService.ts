import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';
import { notificationService } from './notificationService';
import { userService } from './userService';

// Константы
const REFERRALS_STORAGE_KEY = 'app:referrals';
const CACHE_EXPIRY_MINUTES = 10; // 10 минут

// Интерфейсы для реферальных ссылок
export interface ReferralLink {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  reward: {
    coins?: number;
    energy?: number;
  };
}

export interface ReferralUse {
  id: string;
  referral_id: string;
  user_id: string;
  created_at: string;
  reward_claimed: boolean;
}

export const referralService = {
  /**
   * Создание новой реферальной ссылки
   */
  async createReferralLink(
    userId: string,
    options: {
      expiresAt?: Date;
      maxUses?: number;
      reward?: { coins?: number; energy?: number };
    } = {}
  ): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Генерируем уникальный код через RPC функцию
      const { data: codeData, error: codeError } = await supabase.rpc('generate_referral_code');
      
      if (codeError) {
        console.error('Error generating referral code:', codeError);
        return { success: false, error: 'Ошибка генерации реферального кода' };
      }
      
      const code = codeData as string;
      
      // Создаем реферальную ссылку
      const { data, error } = await supabase
        .from('referral_links')
        .insert([
          {
            user_id: userId,
            code,
            expires_at: options.expiresAt?.toISOString() || null,
            max_uses: options.maxUses || null,
            reward: options.reward || { coins: 100, energy: 100 }
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating referral link:', error);
        return { success: false, error: 'Не удалось создать реферальную ссылку' };
      }
      
      // Очищаем кэш реферальных ссылок для этого пользователя
      storage.remove(`${REFERRALS_STORAGE_KEY}:${userId}`);
      
      return { success: true, code };
    } catch (error) {
      console.error('Error in createReferralLink:', error);
      return { success: false, error: 'Произошла ошибка при создании реферальной ссылки' };
    }
  },

  /**
   * Получение всех реферальных ссылок пользователя
   */
  async getUserReferralLinks(userId: string): Promise<ReferralLink[]> {
    try {
      // Сначала проверяем кэш
      const cacheKey = `${REFERRALS_STORAGE_KEY}:${userId}`;
      const cachedLinks = storage.get<ReferralLink[]>(cacheKey);
      if (cachedLinks) {
        return cachedLinks;
      }
      
      // Если данных в кэше нет, запрашиваем из Supabase
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user referral links:', error);
        return [];
      }
      
      // Сохраняем в кэш
      storage.set<ReferralLink[]>(cacheKey, data, CACHE_EXPIRY_MINUTES);
      
      return data;
    } catch (error) {
      console.error('Error in getUserReferralLinks:', error);
      return [];
    }
  },

  /**
   * Использование реферального кода
   */
  async useReferralCode(code: string, userId: string): Promise<{
    success: boolean;
    message: string;
    reward?: { coins?: number; energy?: number };
    referrer_id?: string;
  }> {
    try {
      // Используем RPC функцию для применения реферального кода
      const { data, error } = await supabase.rpc('use_referral_code', {
        p_code: code,
        p_user_id: userId,
        p_ip_address: null
      });
      
      if (error) {
        console.error('Error using referral code:', error);
        return { 
          success: false, 
          message: error.message || 'Ошибка при использовании реферального кода' 
        };
      }
      
      // Если успешно и есть вознаграждение
      if (data.success) {
        // Обновляем локальное состояние (энергия будет обновлена через GameContext)
        return {
          success: true,
          message: data.message || 'Реферальный код успешно активирован',
          reward: data.reward,
          referrer_id: data.referrer_id
        };
      } else {
        return {
          success: false,
          message: data.message || 'Не удалось использовать реферальный код'
        };
      }
    } catch (error) {
      console.error('Error in useReferralCode:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Произошла ошибка при обработке реферального кода' 
      };
    }
  },

  /**
   * Получение статистики реферальных ссылок пользователя
   */
  async getReferralStats(userId: string): Promise<{
    totalLinks: number;
    totalUses: number;
    activeLinks: number;
  }> {
    try {
      // Получаем все ссылки пользователя
      const links = await this.getUserReferralLinks(userId);
      
      // Получаем все активные ссылки
      const activeLinks = links.filter(link => link.is_active);
      
      // Подсчитываем общее количество использований
      const totalUses = links.reduce((sum, link) => sum + link.use_count, 0);
      
      return {
        totalLinks: links.length,
        totalUses,
        activeLinks: activeLinks.length
      };
    } catch (error) {
      console.error('Error in getReferralStats:', error);
      return { totalLinks: 0, totalUses: 0, activeLinks: 0 };
    }
  },

  /**
   * Деактивация реферальной ссылки
   */
  async deactivateReferralLink(linkId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('referral_links')
        .update({ is_active: false })
        .eq('id', linkId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deactivating referral link:', error);
        return { success: false, error: 'Не удалось деактивировать реферальную ссылку' };
      }
      
      // Очищаем кэш реферальных ссылок для этого пользователя
      storage.remove(`${REFERRALS_STORAGE_KEY}:${userId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error in deactivateReferralLink:', error);
      return { success: false, error: 'Произошла ошибка при деактивации реферальной ссылки' };
    }
  },

  /**
   * Генерация полной реферальной ссылки для отправки
   */
  generateShareableLink(code: string): string {
    // Формируем ссылку на основной домен приложения
    const appUrl = 'https://yasukapersbot.netlify.app';
    return `${appUrl}?ref=${code}`;
  },

  /**
   * Извлечение реферального кода из URL
   */
  extractReferralCodeFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  },
  
  /**
   * Получение активных реферальных ссылок пользователя
   * Отфильтрованных по активности (is_active = true)
   */
  async getActiveReferralLinks(userId: string): Promise<ReferralLink[]> {
    try {
      const links = await this.getUserReferralLinks(userId);
      return links.filter(link => link.is_active);
    } catch (error) {
      console.error('Error in getActiveReferralLinks:', error);
      return [];
    }
  },
  
  /**
   * Получение информации о реферальной ссылке по коду
   */
  async getReferralLinkByCode(code: string): Promise<ReferralLink | null> {
    try {
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();
        
      if (error || !data) {
        console.error('Error fetching referral link by code:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getReferralLinkByCode:', error);
      return null;
    }
  }
};