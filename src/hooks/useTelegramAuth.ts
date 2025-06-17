import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { supabase } from '../lib/supabase';

/**
 * Хук для работы с Telegram авторизацией
 */
export function useTelegramAuth() {
  const { telegram, user: telegramUser, isReady } = useTelegram();
  const [authInProgress, setAuthInProgress] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  const [lastAuthResult, setLastAuthResult] = useState<any>(null);
  const [initDataStatus, setInitDataStatus] = useState<{
    available: boolean;
    length: number;
    valid?: boolean;
  }>({ available: false, length: 0 });

  // Проверяем доступность и валидность initData
  useEffect(() => {
    if (telegram?.initData) {
      setInitDataStatus({
        available: true,
        length: telegram.initData.length,
        valid: undefined // Валидность можно проверить только на сервере
      });
    } else {
      setInitDataStatus({ available: false, length: 0 });
    }
  }, [telegram?.initData]);

  // Функция для выполнения авторизации через Telegram
  const authenticateWithTelegram = useCallback(async () => {
    if (!isReady || !telegramUser) {
      setLastAuthError('Telegram WebApp не готов или нет данных пользователя');
      return { success: false, error: 'Telegram WebApp не готов или нет данных пользователя' };
    }

    setAuthInProgress(true);
    setLastAuthError(null);
    
    try {
      console.log('useTelegramAuth: Начинаем прямой вызов telegram-auth Edge Function');
      
      // Подготавливаем данные для запроса к функции авторизации
      const authData = {
        telegramData: {
          user: {
            id: telegramUser.id,
            username: telegramUser.username,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            photo_url: telegramUser.photo_url
          },
          initData: telegram?.initData || '',
          initDataUnsafe: telegram?.initDataUnsafe || {} // Добавляем initDataUnsafe
        }
      };
      
      console.log('useTelegramAuth: Отправляем запрос с данными:', {
        userId: telegramUser.id,
        initDataLength: (telegram?.initData || '').length
      });
      
      // Делаем запрос к Edge Function напрямую для тестирования
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(authData),
      });
      
      console.log('useTelegramAuth: Получен ответ со статусом:', response.status);
      
      const data = await response.json();
      
      console.log('useTelegramAuth: Ответ распарсен, success =', data.success);
      
      setLastAuthResult(data);
      
      if (!response.ok || !data.success) {
        const errorMessage = data.error || `HTTP ошибка: ${response.status}`;
        setLastAuthError(errorMessage);
        console.error('useTelegramAuth: Ошибка от сервера:', errorMessage);
        setAuthInProgress(false);
        return { success: false, error: errorMessage };
      }
      
      console.log('useTelegramAuth: Авторизация успешна, устанавливаем сессию');
      
      // Если получили успешный ответ с сессией, устанавливаем её
      if (data.session && data.session.access_token) {
        console.log('useTelegramAuth: Устанавливаем сессию напрямую', { 
          hasAccessToken: !!data.session.access_token,
          hasRefreshToken: !!data.session.refresh_token,
          expiresAt: data.session.expires_at
        });
        
        try {
          const sessionParams = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || '',
          };
          
          console.log('useTelegramAuth: Вызываем supabase.auth.setSession()');
          
          const { error: sessionError } = await supabase.auth.setSession(sessionParams);
          
          if (sessionError) {
            const errMsg = `Ошибка при установке сессии: ${sessionError.message}`;
            console.error('useTelegramAuth:', errMsg);
            setLastAuthError(errMsg);
            setAuthInProgress(false);
            return { success: false, error: errMsg };
          }
          
          // Проверяем, что сессия действительно установлена
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('useTelegramAuth: Сессия успешно установлена:', {
              userId: sessionData.session.user?.id,
              expiresAt: sessionData.session.expires_at
            });
          } else {
            console.warn('useTelegramAuth: Сессия не установилась после setSession');
          }
          
          console.log('useTelegramAuth: Процесс авторизации завершен успешно');
          setAuthInProgress(false);
          return { 
            success: true, 
            user: data.user,
            session: sessionData.session 
          };
        } catch (setSessionError) {
          const errMsg = `Исключение при установке сессии: ${setSessionError instanceof Error ? setSessionError.message : 'Неизвестная ошибка'}`;
          console.error('useTelegramAuth:', errMsg);
          setLastAuthError(errMsg);
          setAuthInProgress(false);
          return { success: false, error: errMsg };
        }
      } else {
        const errMsg = 'Сессия отсутствует в ответе сервера';
        console.error('useTelegramAuth:', errMsg);
        setLastAuthError(errMsg);
        setAuthInProgress(false);
        return { success: false, error: errMsg };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('useTelegramAuth: Исключение в authenticateWithTelegram:', errorMessage);
      setLastAuthError(errorMessage);
      setAuthInProgress(false);
      return { success: false, error: errorMessage };
    }
  }, [isReady, telegram, telegramUser]);

  // Функция для проверки текущей сессии
  const checkCurrentSession = useCallback(async () => {
    try {
      console.log('useTelegramAuth: Проверяем текущую сессию');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('useTelegramAuth: Ошибка при проверке сессии:', error);
        return { 
          hasSession: false, 
          error: error.message,
          message: 'Ошибка при проверке сессии'
        };
      }
      
      if (data.session) {
        console.log('useTelegramAuth: Сессия найдена:', {
          userId: data.session.user?.id,
          expiresAt: data.session.expires_at
        });
      } else {
        console.log('useTelegramAuth: Сессия не найдена');
      }
      
      return { 
        hasSession: !!data.session,
        user: data.session?.user,
        expires_at: data.session?.expires_at,
        message: data.session ? 'Активная сессия найдена' : 'Сессия отсутствует'
      };
    } catch (error) {
      console.error('useTelegramAuth: Исключение при проверке сессии:', error);
      return { 
        hasSession: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        message: 'Исключение при проверке сессии'
      };
    }
  }, []);

  return {
    authenticateWithTelegram,
    checkCurrentSession,
    authInProgress,
    lastAuthError,
    lastAuthResult,
    initDataStatus,
    telegramUser,
    isReady
  };
}