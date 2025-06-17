import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';
import type { User } from '../lib/supabase';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signUp: (name: string, email: string, password: string, phone?: string, telegramId?: number) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  signInWithTelegram: (telegramData: any) => Promise<{ success: boolean; error: string | null; session?: any; token?: string; }>;
  resetError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    const checkAuth = async () => {
      setLoading(true);
      try {
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Ошибка при проверке авторизации');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Подписываемся на изменения состояния авторизации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (event === 'SIGNED_IN' && session) {
          try {
            const currentUser = await userService.getCurrentUser();
            setUser(currentUser);
          } catch (err) {
            console.error('Error getting user after sign in:', err);
          } finally {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      // Отписываемся при размонтировании
      authListener.subscription.unsubscribe();
    };
  }, []);

  const resetError = () => {
    setError(null);
  };

  // Функция для входа через Telegram
  const signInWithTelegram = async (telegramData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: Начинаем авторизацию через Telegram');
      
      const result = await userService.signInWithTelegram(telegramData);
      
      console.log('AuthContext: Результат авторизации через Telegram:', {
        success: result.success,
        error: result.error,
        hasSession: !!result.session,
        hasToken: !!result.token
      });
      
      if (!result.success) {
        setError(result.error || 'Ошибка при авторизации через Telegram');
        setLoading(false);
        return result;
      }
      
      // Если есть сессия, устанавливаем ее
      if (result.session && result.session.access_token) {
        console.log('AuthContext: Устанавливаем сессию с токеном:', {
          hasAccessToken: !!result.session.access_token,
          hasRefreshToken: !!result.session.refresh_token
        });
        
        const sessionToSet = {
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token || '',
        };
        
        try {
          const { data: setData, error: setSessionError } = await supabase.auth.setSession(sessionToSet);
          
          if (setSessionError) {
            console.error('AuthContext: Ошибка supabase.auth.setSession:', setSessionError.message, setSessionError);
            setError(`Ошибка при установке сессии: ${setSessionError.message}`);
            setLoading(false);
            return { success: false, error: `Ошибка при установке сессии: ${setSessionError.message}` };
          } else {
            console.log('AuthContext: supabase.auth.setSession УСПЕШНО. Ответ:', setData);
            
            // Сразу проверяем сессию
            const { data: { session: currentSessionAfterSet } } = await supabase.auth.getSession();
            console.log('AuthContext: Сессия из getSession() СРАЗУ ПОСЛЕ setSession:', 
              JSON.stringify(currentSessionAfterSet ? {
                user_id: currentSessionAfterSet.user?.id,
                expires_at: currentSessionAfterSet.expires_at
              } : null));
            
            // Принудительно получаем пользователя, чтобы убедиться, что токен работает
            const { data: { user: userAfterSet }, error: getUserErrorAfterSet } = await supabase.auth.getUser();
            console.log('AuthContext: Пользователь из getUser() ПОСЛЕ setSession:', 
              JSON.stringify(userAfterSet ? { id: userAfterSet.id, email: userAfterSet.email } : null));
            
            if (getUserErrorAfterSet) {
              console.error('AuthContext: Ошибка из getUser() ПОСЛЕ setSession:', getUserErrorAfterSet);
            }
            
            // Если пользователь получен, обновляем состояние
            if (userAfterSet) {
              // Получаем полные данные пользователя
              try {
                const currentUser = await userService.getCurrentUser();
                if (currentUser) {
                  setUser(currentUser);
                  setLoading(false);
                  return { success: true, error: null };
                } else {
                  console.error('AuthContext: getCurrentUser вернул null после успешной установки сессии');
                  setError('Ошибка при получении данных пользователя после авторизации');
                  setLoading(false);
                  return { success: false, error: 'Ошибка при получении данных пользователя' };
                }
              } catch (getUserError) {
                console.error('AuthContext: Ошибка getCurrentUser после установки сессии:', getUserError);
                setError('Ошибка при получении данных пользователя после авторизации');
                setLoading(false);
                return { success: false, error: 'Ошибка при получении данных пользователя' };
              }
            } else {
              console.error('AuthContext: user = null после успешной установки сессии');
              setError('Не удалось получить данные пользователя после авторизации');
              setLoading(false);
              return { success: false, error: 'Не удалось получить данные пользователя' };
            }
          }
        } catch (setSessionCatchError) {
          console.error('AuthContext: Исключение при вызове setSession:', setSessionCatchError);
          setError(`Исключение при установке сессии: ${setSessionCatchError instanceof Error ? setSessionCatchError.message : 'Неизвестная ошибка'}`);
          setLoading(false);
          return { success: false, error: 'Исключение при установке сессии' };
        }
      } else {
        console.error('AuthContext: Сервер не вернул валидный объект сессии или access_token.');
        setError('Сервер не вернул валидный объект сессии.');
        setLoading(false);
        return { success: false, error: 'Сервер не вернул валидный объект сессии' };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при авторизации через Telegram';
      console.error('Error in signInWithTelegram:', err);
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Функция для входа по email и паролю
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.error('Error signing in:', signInError);
        setError(signInError.message);
        setLoading(false);
        return { success: false, error: signInError.message };
      }
      
      if (!data.user) {
        console.error('No user returned after sign in');
        setError('Ошибка при входе в систему');
        setLoading(false);
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
      
      // onAuthStateChange обновит состояние user
      setLoading(false);
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при входе';
      console.error('Error in signIn:', err);
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };
  
  // Функция для регистрации
  const signUp = async (name: string, email: string, password: string, phone?: string, telegramId?: number) => {
    setLoading(true);
    setError(null);
    
    try {
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
        console.error('Error signing up:', signUpError);
        setError(signUpError.message);
        setLoading(false);
        return { success: false, error: signUpError.message };
      }
      
      if (!data.user) {
        console.error('No user returned after sign up');
        setError('Ошибка при регистрации');
        setLoading(false);
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
      
      // Создаем персонажа для пользователя
      try {
        await supabase
          .from('character')
          .insert([
            {
              id: data.user.id,
              name: 'Тамагочи',
              rating: 0,
              satiety: 50,
              mood: 50,
              created_at: new Date().toISOString(),
              last_interaction: new Date().toISOString()
            }
          ]);
      } catch (characterError) {
        console.error('Error creating character:', characterError);
        // Продолжаем, даже если не удалось создать персонажа
      }
      
      // onAuthStateChange обновит состояние user
      setLoading(false);
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при регистрации';
      console.error('Error in signUp:', err);
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };
  
  // Функция для выхода
  const signOut = async () => {
    setLoading(true);
    try {
      await userService.signOut();
      setUser(null);
      // Очистка локального хранилища при выходе
      storage.clear();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        signInWithTelegram,
        resetError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста авторизации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};