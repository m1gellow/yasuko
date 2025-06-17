import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';
import { USER_STORAGE_KEY } from '../services/userService';
import { useTelegram } from '../contexts/TelegramContext';

export function useEmailAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { telegram } = useTelegram();

  // Функция для входа по email/паролю
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Хаптик-фидбек перед началом авторизации
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('light');
      }
      
      // Используем Supabase Auth API для входа
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
        
        // Улучшаем сообщение об ошибке для пользователя
        let errorMessage = signInError.message;
        if (signInError.message === 'Invalid login credentials') {
          errorMessage = 'Неверный email или пароль';
        }
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
      
      if (!data.user) {
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
        
        setError('Ошибка при входе в систему');
        setIsLoading(false);
        return { success: false, error: 'Ошибка при входе в систему' };
      }
      
      // Обновляем время последнего входа
      try {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
      } catch (updateError) {
        console.error('Error updating last_login:', updateError);
        // Продолжаем даже при ошибке обновления
      }
      
      // Хаптик-фидбек при успешном входе
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
      
      setSuccess(true);
      setIsLoading(false);
      return { success: true, error: null, user: data.user };
    } catch (err) {
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при входе';
      console.error('Error in signInWithEmail:', err);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [telegram]);
  
  // Функция для регистрации
  const signUpWithEmail = useCallback(async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    telegramId?: number
  ) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Хаптик-фидбек перед началом регистрации
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('light');
      }
      
      // Регистрируем пользователя в Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            telegram_id: telegramId
          }
        }
      });
      
      if (signUpError) {
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
        
        // Улучшаем сообщение об ошибке
        let errorMessage = signUpError.message;
        if (signUpError.message.includes("User already registered")) {
          errorMessage = "Пользователь с таким email уже зарегистрирован";
        }
        
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
      
      if (!data.user) {
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
        
        setError('Ошибка при регистрации');
        setIsLoading(false);
        return { success: false, error: 'Ошибка при регистрации' };
      }
      
      // Создаем запись в таблице users
      try {
        await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              name,
              phone: phone || '',
              password_hash: 'auth_managed',
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              telegram_id: telegramId,
              total_clicks: 50, // Начальные монеты
              games_owned: ['nut-catcher-game'] // По умолчанию дается игра
            }
          ]);
      } catch (insertError) {
        console.error('Error creating user record:', insertError);
        // Продолжаем, даже если не удалось создать запись
      }
      
      // Создаем персонажа для пользователя через RPC
      try {
        await supabase.rpc('find_or_create_character', {
          p_user_id: data.user.id
        });
      } catch (characterError) {
        console.error('Error creating character:', characterError);
        // Продолжаем, даже если не удалось создать персонажа
      }
      
      // Хаптик-фидбек при успешной регистрации
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
      
      setSuccess(true);
      setIsLoading(false);
      return { success: true, error: null, user: data.user };
    } catch (err) {
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при регистрации';
      console.error('Error in signUpWithEmail:', err);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [telegram]);
  
  // Функция для выхода из аккаунта
  const signOut = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Хаптик-фидбек перед выходом
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('medium');
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        setError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }
      
      // Очистка локального хранилища
      storage.remove(USER_STORAGE_KEY);
      
      setIsLoading(false);
      return { success: true, error: null };
    } catch (error) {
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при выходе';
      console.error('Error in signOut:', error);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [telegram]);
  
  // Функция для сброса ошибок
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetError,
    isLoading,
    error,
    success
  };
}