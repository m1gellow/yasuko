import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../contexts/TelegramContext';

/**
 * Хук для авторизации через Telegram с использованием гибридного подхода
 * Регистрация/вход выполняется прямо на клиенте через стандартные методы Supabase Auth
 * Триггер на стороне PostgreSQL создает профиль и персонажа
 */
export function useTelegramHybridAuth() {
  const { telegram, user: telegramUser, isReady } = useTelegram();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<{
    success: boolean;
    isNewUser?: boolean;
    email?: string;
    password?: string;
    userId?: string;
  } | null>(null);
  
  // Статус initData для отладки
  const [initDataStatus, setInitDataStatus] = useState({
    available: false,
    length: 0
  });
  
  // Проверяем доступность initData
  useEffect(() => {
    if (telegram?.initData) {
      setInitDataStatus({
        available: true,
        length: telegram.initData.length
      });
    }
  }, [telegram?.initData]);

  // Авторизация через Telegram
  const signUpOrSignInWithTelegram = useCallback(async () => {
    if (!isReady || !telegramUser) {
      const errMsg = 'Telegram WebApp не готов или данные пользователя отсутствуют';
      setError(errMsg);
      return { success: false, error: errMsg };
    }

    setIsLoading(true);
    setError(null);
    setAuthResult(null);

    try {
      console.log('useTelegramHybridAuth: Начинаем авторизацию для пользователя:', 
        telegramUser.id, telegramUser.username);
      
      // Формируем email и пароль на основе Telegram ID
      const email = `telegram${telegramUser.id}@example.com`;
      // Генерируем детерминированный пароль для упрощения
      const password = `tg_${telegramUser.id}_${new Date().getFullYear()}`;
      
      // Сохраняем учетные данные в локальное хранилище
      try {
        localStorage.setItem('telegram_auth_email', email);
        localStorage.setItem('telegram_auth_password', password);
        console.log('useTelegramHybridAuth: Учетные данные сохранены в localStorage');
      } catch (storageError) {
        console.warn('useTelegramHybridAuth: Не удалось сохранить учетные данные в localStorage', storageError);
      }

      console.log('useTelegramHybridAuth: Сначала пробуем войти с данными:', { 
        email, 
        passwordLength: password.length 
      });

      // Сначала пробуем войти (если пользователь уже зарегистрирован)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // Если вход успешен, значит пользователь уже зарегистрирован
      if (!signInError && signInData.user) {
        console.log('useTelegramHybridAuth: Успешный вход (существующий пользователь)');
        
        // Обновляем метаданные пользователя для сохранения акутальной информации
        try {
          await supabase.auth.updateUser({
            data: {
              telegram_id: telegramUser.id,
              telegram_username: telegramUser.username, 
              name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" "),
              avatar_url: telegramUser.photo_url,
              last_login: new Date().toISOString()
            }
          });
        } catch (updateError) {
          console.warn('Не удалось обновить метаданные пользователя:', updateError);
        }
        
        // Обновляем аватар, если он доступен
        if (telegramUser.photo_url) {
          try {
            await supabase
              .from('users')
              .update({ 
                avatar_url: telegramUser.photo_url,
                last_login: new Date().toISOString()
              })
              .eq('id', signInData.user.id);
          } catch (avatarError) {
            console.warn('Не удалось обновить аватар пользователя:', avatarError);
          }
        }
        
        const result = {
          success: true,
          isNewUser: false,
          email,
          password,
          userId: signInData.user.id
        };
        setAuthResult(result);
        setIsLoading(false);
        return result;
      }

      console.log('useTelegramHybridAuth: Вход не удался, пробуем регистрацию.');

      // Если ошибка входа, регистрируем нового пользователя
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            telegram_id: telegramUser.id,
            telegram_username: telegramUser.username,
            name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" "),
            avatar_url: telegramUser.photo_url
          }
        }
      });

      if (signUpError) {
        // Проверяем, не связана ли ошибка с тем, что пользователь уже существует
        if (signUpError.message.includes('already registered') || 
            signUpError.message.includes('User already exists')) {
          console.warn('useTelegramHybridAuth: Пользователь уже зарегистрирован, но пароль не подходит');
          
          const errMsg = 'Пользователь уже зарегистрирован, но пароль не подходит';
          setError(errMsg);
          setIsLoading(false);
          return {
            success: false,
            error: errMsg,
            email
          };
        }

        console.error('useTelegramHybridAuth: Ошибка регистрации:', signUpError.message);
        setError(signUpError.message);
        setIsLoading(false);
        return { success: false, error: signUpError.message };
      }

      // Если регистрация успешна
      console.log('useTelegramHybridAuth: Успешная регистрация (новый пользователь)');
      
      // Добавляем аватар в запись пользователя
      if (signUpData?.user?.id && telegramUser.photo_url) {
        try {
          await supabase
            .from('users')
            .update({ 
              avatar_url: telegramUser.photo_url
            })
            .eq('id', signUpData.user.id);
        } catch (avatarError) {
          console.warn('Не удалось добавить аватар пользователя:', avatarError);
        }
      }
      
      // Используем RPC функцию для создания персонажа как обходное решение для RLS
      try {
        await supabase.rpc('find_or_create_character', {
          p_user_id: signUpData?.user?.id
        });
        console.log('useTelegramHybridAuth: Персонаж создан через RPC функцию');
      } catch (rpcError) {
        console.error('useTelegramHybridAuth: Ошибка при вызове RPC функции:', rpcError);
      }
      
      const result = {
        success: true,
        isNewUser: true,
        email,
        password,
        userId: signUpData?.user?.id
      };
      setAuthResult(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      console.error('useTelegramHybridAuth: Исключение:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [isReady, telegramUser]);

  // Сброс ошибок
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signUpOrSignInWithTelegram,
    isLoading,
    error,
    authResult,
    resetError,
    initDataStatus,
    telegramUser
  };
}