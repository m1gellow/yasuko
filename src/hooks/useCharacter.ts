import { useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { Character } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

export function useCharacter() {
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  
  const { data, loading, error, refetch } = useSupabase<Character>({
    table: 'character',
    query: user ? { eq: ['id', user.id] } : undefined,
    cacheKey: user ? `character:${user.id}` : undefined,
    cacheDuration: 5, // 5 минут
    dependencies: [user?.id]
  });

  // Синхронизируем данные персонажа с GameContext
  useEffect(() => {
    if (data.length > 0 && user) {
      const character = data[0];
      
      dispatch({ 
        type: 'UPDATE_CHARACTER',
        payload: {
          name: character.name || 'Тамагочи',
          rating: character.rating || 0,
          satiety: character.satiety || 50,
          mood: character.mood || 50
        }
      } as any);
    }
  }, [data, dispatch, user]);

  // Обновление персонажа в базе данных
  const updateCharacter = async (updates: Partial<Character>) => {
    if (!user) return { success: false, error: 'Пользователь не авторизован' };
    
    try {
      const result = await fetch(`/api/character/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!result.ok) {
        throw new Error('Ошибка при обновлении персонажа');
      }
      
      // Обновляем локальный кэш
      refetch();
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating character:', error);
      return { success: false, error: `Ошибка: ${error}` };
    }
  };

  return { 
    character: data[0] || null, 
    loading, 
    error, 
    refetch, 
    updateCharacter 
  };
}