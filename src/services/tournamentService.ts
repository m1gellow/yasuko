import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

// Константы
const TOURNAMENTS_STORAGE_KEY = 'app:tournaments';
const USER_TOURNAMENTS_STORAGE_KEY = 'app:userTournaments';
const CACHE_EXPIRY_MINUTES = 5; // 5 минут

// Типы данных для турниров
export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'weekly' | 'monthly';
  prizePool: number;
  requiredPosition: number;
  isActive: boolean;
  createdAt: string;
}

export interface UserTournament {
  id: string;
  userId: string;
  tournamentId: string;
  rankPosition: number;
  previousRankPosition: number;
  score: number;
  rewardClaimed: boolean;
  joinedAt: string;
}

export interface TournamentPosition {
  position: number;
  previousPosition: number;
  change: number;
}

export const tournamentService = {
  /**
   * Получение активных турниров
   */
  async getActiveTournaments(): Promise<Tournament[]> {
    try {
      // Сначала проверяем кэш
      const cachedTournaments = storage.get<Tournament[]>(TOURNAMENTS_STORAGE_KEY);
      if (cachedTournaments) {
        return cachedTournaments;
      }

      // Вместо RPC, просто получаем активные турниры напрямую
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active tournaments:', error);
        return [];
      }

      // Преобразуем данные в нужный формат
      const tournaments: Tournament[] = data.map((tournament: any) => ({
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        startDate: tournament.start_date,
        endDate: tournament.end_date,
        type: tournament.type,
        prizePool: tournament.prize_pool,
        requiredPosition: tournament.required_position,
        isActive: tournament.is_active,
        createdAt: tournament.created_at,
      }));

      // Сохраняем в кэш
      storage.set(TOURNAMENTS_STORAGE_KEY, tournaments, CACHE_EXPIRY_MINUTES);

      return tournaments;
    } catch (error) {
      console.error('Error in getActiveTournaments:', error);
      return [];
    }
  },

  /**
   * Получение позиции пользователя в турнире
   */
  async getUserTournamentPosition(userId: string, tournamentId: string): Promise<TournamentPosition | null> {
    try {
      // Используем кэширование для позиции в турнире
      const cacheKey = `tournament_position_${userId}_${tournamentId}`;
      const cachedPosition = localStorage.getItem(cacheKey);
      
      if (cachedPosition) {
        try {
          const { data, timestamp } = JSON.parse(cachedPosition);
          // Если кэш не старше 1 минуты, используем его
          if (Date.now() - timestamp < 60000) {
            return data;
          }
        } catch (e) {
          console.error('Ошибка при чтении кэша позиции в турнире:', e);
        }
      }
      
      // Получаем ранг пользователя напрямую
      const { data: rankData } = await supabase.rpc('get_user_rank', {
        user_id: userId
      });
      
      // Получаем текущую запись пользователя в турнире (если есть)
      const { data: userTournament } = await supabase
        .from('user_tournaments')
        .select('rank_position, previous_rank_position, score')
        .eq('user_id', userId)
        .eq('tournament_id', tournamentId)
        .maybeSingle();
      
      const position = rankData || 0;
      
      // Определяем значения для обновления/вставки
      const previousPosition = userTournament?.previous_rank_position || position;
      const currentScore = userTournament?.score || 0;
      
      // Используем UPSERT вместо раздельных INSERT/UPDATE
      // Это гарантирует, что мы не нарушим ограничение уникальности
      const { error: upsertError } = await supabase
        .from('user_tournaments')
        .upsert({
          user_id: userId,
          tournament_id: tournamentId,
          rank_position: position,
          previous_rank_position: userTournament ? userTournament.rank_position : position,
          score: currentScore,
          joined_at: userTournament ? undefined : new Date().toISOString() // только для новых записей
        }, {
          onConflict: 'user_id,tournament_id', // указываем поля для определения конфликта
          ignoreDuplicates: false // обновляем при конфликте
        });
      
      if (upsertError) {
        console.error('Ошибка при обновлении позиции в турнире:', upsertError);
      }
      
      const result = {
        position,
        previousPosition,
        change: previousPosition - position
      };
      
      // Сохраняем в кэш
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
      
      return result;
    } catch (error) {
      console.error('Error in getUserTournamentPosition:', error);
      return null;
    }
  },

  /**
   * Проверка возможности получить награду за турнир
   */
  async canClaimTournamentReward(userId: string, tournamentId: string): Promise<boolean> {
    try {
      // Проверяем кэш
      const cacheKey = `can_claim_reward_${userId}_${tournamentId}`;
      const cachedResult = localStorage.getItem(cacheKey);
      
      if (cachedResult) {
        try {
          const { data, timestamp } = JSON.parse(cachedResult);
          // Если кэш не старше 5 минут, используем его
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        } catch (e) {
          console.error('Ошибка при чтении кэша статуса награды:', e);
        }
      }

      // Получаем информацию о турнире
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle();

      if (tournamentError || !tournamentData) {
        console.error('Error fetching tournament:', tournamentError);
        return false;
      }

      // Получаем информацию о пользовательском турнире
      const { data: userTournamentData, error: userTournamentError } = await supabase
        .from('user_tournaments')
        .select('*')
        .eq('user_id', userId)
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (userTournamentError) {
        console.error('Error fetching user tournament:', userTournamentError);
        return false;
      }

      // Проверяем, может ли пользователь получить награду
      if (!userTournamentData) {
        return false;
      }
      
      const canClaim = (
        !userTournamentData.reward_claimed &&
        userTournamentData.rank_position <= tournamentData.required_position
      );
      
      // Сохраняем результат в кэш
      localStorage.setItem(cacheKey, JSON.stringify({
        data: canClaim,
        timestamp: Date.now()
      }));

      return canClaim;
    } catch (error) {
      console.error('Error in canClaimTournamentReward:', error);
      return false;
    }
  },

  /**
   * Получение награды за турнир
   */
  async claimTournamentReward(userId: string, tournamentId: string): Promise<{
    success: boolean;
    message: string;
    reward?: { coins: number };
  }> {
    try {
      // Проверяем возможность получить награду
      const canClaim = await this.canClaimTournamentReward(userId, tournamentId);
      if (!canClaim) {
        return {
          success: false,
          message: 'Вы не можете получить награду за этот турнир',
        };
      }

      // Получаем информацию о турнире
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle();

      if (tournamentError || !tournamentData) {
        console.error('Error fetching tournament:', tournamentError);
        return {
          success: false,
          message: 'Ошибка при получении информации о турнире',
        };
      }

      // Получаем информацию о пользовательском турнире
      const { data: userTournamentData, error: userTournamentError } = await supabase
        .from('user_tournaments')
        .select('*')
        .eq('user_id', userId)
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (userTournamentError || !userTournamentData) {
        console.error('Error fetching user tournament:', userTournamentError);
        return {
          success: false,
          message: 'Ошибка при получении информации об участии в турнире',
        };
      }

      // Рассчитываем награду
      const rewardCoins = Math.floor(tournamentData.prize_pool / userTournamentData.rank_position);

      // Обновляем информацию о получении награды
      const { error: updateError } = await supabase
        .from('user_tournaments')
        .update({ reward_claimed: true })
        .eq('user_id', userId)
        .eq('tournament_id', tournamentId);

      if (updateError) {
        console.error('Error updating user tournament:', updateError);
        return {
          success: false,
          message: 'Ошибка при получении награды',
        };
      }

      // Создаем уведомление о получении награды
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            type: 'reward',
            title: 'Награда за турнир!',
            message: `Вы получили ${rewardCoins} монет за участие в турнире "${tournamentData.name}"`,
            data: {
              reward_type: 'tournament',
              tournament_id: tournamentId,
              tournament_name: tournamentData.name,
              amount: rewardCoins,
            },
          },
        ]);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
      
      // Очищаем кэш, связанный с этим турниром для пользователя
      const cacheKey = `can_claim_reward_${userId}_${tournamentId}`;
      localStorage.removeItem(cacheKey);
      
      const positionCacheKey = `tournament_position_${userId}_${tournamentId}`;
      localStorage.removeItem(positionCacheKey);

      return {
        success: true,
        message: 'Награда успешно получена!',
        reward: {
          coins: rewardCoins,
        },
      };
    } catch (error) {
      console.error('Error in claimTournamentReward:', error);
      return {
        success: false,
        message: 'Произошла ошибка при получении награды',
      };
    }
  },
};