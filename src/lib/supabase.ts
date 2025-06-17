import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Получение переменных окружения из Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Создание клиента Supabase
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true, // Сохранять сессию в localStorage
      autoRefreshToken: true, // Автоматически обновлять токен
    },
    realtime: {
      params: {
        eventsPerSecond: 10 // Ограничение количества событий в секунду
      }
    }
  }
);

// Типы данных из базы
export type Tables = Database['public']['Tables'];
export type User = Tables['users']['Row'];
export type Character = Tables['character']['Row'];
export type Level = Tables['levels']['Row'];
export type Phrase = Tables['phrases']['Row'];
export type PromoCode = Tables['promo_codes']['Row'];
export type UserPromoCode = Tables['user_promo_codes']['Row'];
export type UserStat = Tables['user_stats']['Row'];
export type Message = Tables['messages']['Row'];
export type Notification = Tables['notifications']['Row'];