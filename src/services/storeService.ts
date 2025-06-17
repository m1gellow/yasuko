import { storage } from '../utils/storage';
import { supabase, PromoCode, UserPromoCode } from '../lib/supabase';
import { StoreItem } from '../types';
import { atom } from 'jotai';
import { userService } from './userService';

// Constants
const STORE_ITEMS_STORAGE_KEY = 'app:storeItems';
const PROMO_CODES_STORAGE_KEY = 'app:promoCodes';
const PURCHASED_ITEMS_STORAGE_KEY = 'app:purchasedItems';
const CACHE_EXPIRY_MINUTES = 5; // Уменьшаем до 5 минут для более частого обновления

// Atoms for global state
export const storeItemsAtom = atom<StoreItem[]>([]);
export const isLoadingStoreAtom = atom<boolean>(false);
export const storeErrorAtom = atom<string | null>(null);

export const storeService = {
  /**
   * Получение списка товаров из базы данных Supabase с приоритетом кэша
   */
  async getStoreItems(forceRefresh = false): Promise<StoreItem[]> {
    try {
      // Сначала проверяем кэш, если не требуется принудительное обновление
      if (!forceRefresh) {
        const cachedItems = storage.get<StoreItem[]>(STORE_ITEMS_STORAGE_KEY);
        if (cachedItems) {
          return cachedItems;
        }
      }

      // Если данных в кэше нет или требуется обновление, запрашиваем из Supabase
      const { data, error } = await supabase
        .from('game_items')
        .select('*')
        .eq('available', true);

      if (error) {
        console.error('Error fetching store items:', error);
        return []; // Возвращаем пустой массив вместо мока
      }

      // Преобразуем данные из Supabase в формат StoreItem
      const items: StoreItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.image_url || `/assets/${item.type.toLowerCase()}.png`,
        price: item.price,
        discountPercent: item.discount_percent,
        originalPrice: item.original_price,
        category: item.type,
        duration: item.duration,
        isPermanent: item.is_permanent,
        isNew: item.is_new
      }));
      
      console.log('Loaded items from Supabase:', items);
      
      // Сохраняем в кэш
      storage.set<StoreItem[]>(STORE_ITEMS_STORAGE_KEY, items, CACHE_EXPIRY_MINUTES);
      
      return items;
    } catch (error) {
      console.error('Error in getStoreItems:', error);
      return []; // Возвращаем пустой массив вместо мока
    }
  },

  /**
   * Принудительное обновление списка товаров из Supabase
   */
  async refetchStoreItems(): Promise<StoreItem[]> {
    // Удаляем данные из кэша
    storage.remove(STORE_ITEMS_STORAGE_KEY);
    
    // Запрашиваем новые данные с принудительным обновлением
    return this.getStoreItems(true);
  },

  /**
   * Получение активных промокодов пользователя
   */
  async getUserPromoCodes(userId: string): Promise<UserPromoCode[]> {
    try {
      // Сначала проверяем кэш
      const cacheKey = `${PROMO_CODES_STORAGE_KEY}:${userId}`;
      const cachedCodes = storage.get<UserPromoCode[]>(cacheKey);
      if (cachedCodes) {
        return cachedCodes;
      }

      // Запрашиваем данные из Supabase
      const { data, error } = await supabase
        .from('user_promo_codes')
        .select(`
          *,
          promo_codes (*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching promo codes:', error);
        return [];
      }

      // Сохраняем в кэш на короткое время
      storage.set<UserPromoCode[]>(cacheKey, data, 5); // 5 минут
      
      return data;
    } catch (error) {
      console.error('Error in getUserPromoCodes:', error);
      return [];
    }
  },

  /**
   * Получение списка приобретенных товаров
   */
  async getPurchasedItems(userId: string): Promise<StoreItem[]> {
    try {
      // Сначала проверяем кэш
      const cacheKey = `${PURCHASED_ITEMS_STORAGE_KEY}:${userId}`;
      const cachedItems = storage.get<StoreItem[]>(cacheKey);
      if (cachedItems) {
        return cachedItems;
      }

      // Получаем данные о пользователе из Supabase, включая games_owned
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('games_owned')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return [];
      }

      // Получаем все товары магазина из базы данных
      const allItems = await this.getStoreItems();
      
      // Создаем список купленных товаров
      let purchasedItems: StoreItem[] = [];
      
      // Добавляем игры, которыми владеет пользователь
      if (userData.games_owned && Array.isArray(userData.games_owned)) {
        userData.games_owned.forEach((gameId: string) => {
          const game = allItems.find(item => item.id === gameId);
          if (game) purchasedItems.push(game);
        });
      }
      
      // Если у пользователя есть игра "Ловитель орехов" (проверка в localStorage)
      if (localStorage.getItem('hasNutCatcherGame') === 'true') {
        const nutCatcherGame = allItems.find(item => item.name === 'ЛОВИТЕЛЬ ОРЕХОВ');
        if (nutCatcherGame && !purchasedItems.some(item => item.name === 'ЛОВИТЕЛЬ ОРЕХОВ')) {
          purchasedItems.push(nutCatcherGame);
        }
      }

      // Сохраняем в кэш
      storage.set(cacheKey, purchasedItems, CACHE_EXPIRY_MINUTES);
      
      return purchasedItems;
    } catch (error) {
      console.error('Error in getPurchasedItems:', error);
      
      // Проверяем локальное хранилище в случае ошибки
      if (localStorage.getItem('hasNutCatcherGame') === 'true') {
        const allItems = await this.getStoreItems();
        const nutCatcherGame = allItems.find(item => item.name === 'ЛОВИТЕЛЬ ОРЕХОВ');
        return nutCatcherGame ? [nutCatcherGame] : [];
      }
      
      return [];
    }
  },

  /**
   * Применение промокода
   */
  async applyPromoCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      // Проверяем существование промокода
      const { data: promoData, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('title', code)
        .single();

      if (promoError || !promoData) {
        return { success: false, message: 'Промокод не найден' };
      }

      // Проверяем срок действия
      if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
        return { success: false, message: 'Срок действия промокода истек' };
      }

      // Проверяем, не использовал ли пользователь уже этот промокод
      const { data: existingPromo, error: existingPromoError } = await supabase
        .from('user_promo_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('promo_id', promoData.id)
        .single();

      if (existingPromo) {
        return { success: false, message: 'Вы уже использовали этот промокод' };
      }

      // Создаем запись об использовании промокода
      const expiresAt = promoData.timer 
        ? new Date(Date.now() + parseInt(promoData.timer as string) * 1000).toISOString() 
        : null;

      const { error: insertError } = await supabase
        .from('user_promo_codes')
        .insert([
          {
            user_id: userId,
            promo_id: promoData.id,
            expires_at: expiresAt,
            is_active: true
          }
        ]);

      if (insertError) {
        console.error('Error applying promo code:', insertError);
        return { success: false, message: 'Ошибка при применении промокода' };
      }

      // Очищаем кэш промокодов
      storage.remove(`${PROMO_CODES_STORAGE_KEY}:${userId}`);

      // Обновляем список использованных промокодов в профиле пользователя
      try {
        await supabase.rpc('add_used_promo_code', { 
          user_id: userId, 
          promo_code: code 
        });
      } catch (rpcError) {
        console.error('Error updating used promo codes:', rpcError);
      }

      return { success: true, message: 'Промокод успешно применен!' };
    } catch (error) {
      console.error('Error in applyPromoCode:', error);
      return { success: false, message: 'Произошла ошибка при применении промокода' };
    }
  },

  /**
   * Обновление информации о товаре
   */
  async updateStoreItem(itemId: string, updates: Partial<StoreItem>): Promise<{ success: boolean; error?: string }> {
    try {
      // Проверяем, что пользователь авторизован
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        return { success: false, error: 'Пользователь не авторизован' };
      }
      
      // Преобразуем данные в формат базы данных
      const dbUpdates: any = {};
      
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.category) dbUpdates.type = updates.category;
      if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
      if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice;
      if (updates.image) dbUpdates.image_url = updates.image;
      if (updates.isPermanent !== undefined) dbUpdates.is_permanent = updates.isPermanent;
      if (updates.duration) dbUpdates.duration = updates.duration;
      if (updates.isNew !== undefined) dbUpdates.is_new = updates.isNew;
      
      // Обновляем запись в базе данных
      const { error } = await supabase
        .from('game_items')
        .update(dbUpdates)
        .eq('id', itemId);
      
      if (error) {
        console.error('Error updating store item:', error);
        return { success: false, error: error.message };
      }
      
      // Очищаем кэш товаров
      storage.remove(STORE_ITEMS_STORAGE_KEY);
      
      return { success: true };
    } catch (error) {
      console.error('Error in updateStoreItem:', error);
      return { success: false, error: 'Произошла ошибка при обновлении товара' };
    }
  },
  
  /**
   * Создание нового товара
   */
  async createStoreItem(item: Omit<StoreItem, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Проверяем, что пользователь авторизован
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        return { success: false, error: 'Пользователь не авторизован' };
      }
      
      // Преобразуем данные в формат базы данных
      const dbItem = {
        name: item.name,
        description: item.description,
        price: item.price,
        type: item.category,
        rarity: 'common', // Значение по умолчанию
        image_url: item.image,
        discount_percent: item.discountPercent,
        original_price: item.originalPrice,
        is_permanent: item.isPermanent,
        duration: item.duration,
        is_new: item.isNew,
        available: true
      };
      
      // Вставляем запись в базу данных
      const { data, error } = await supabase
        .from('game_items')
        .insert([dbItem])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating store item:', error);
        return { success: false, error: error.message };
      }
      
      // Очищаем кэш товаров
      storage.remove(STORE_ITEMS_STORAGE_KEY);
      
      return { success: true, id: data.id };
    } catch (error) {
      console.error('Error in createStoreItem:', error);
      return { success: false, error: 'Произошла ошибка при создании товара' };
    }
  },
  
  /**
   * Удаление товара
   */
  async deleteStoreItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Проверяем, что пользователь авторизован
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        return { success: false, error: 'Пользователь не авторизован' };
      }
      
      // Вместо удаления, помечаем товар как недоступный
      const { error } = await supabase
        .from('game_items')
        .update({ available: false })
        .eq('id', itemId);
      
      if (error) {
        console.error('Error marking store item as unavailable:', error);
        return { success: false, error: error.message };
      }
      
      // Очищаем кэш товаров
      storage.remove(STORE_ITEMS_STORAGE_KEY);
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteStoreItem:', error);
      return { success: false, error: 'Произошла ошибка при удалении товара' };
    }
  }
};