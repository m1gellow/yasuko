import { storage } from '../utils/storage';
import { supabase, User } from '../lib/supabase';
import { atom } from 'jotai';

// Constants
export const USER_STORAGE_KEY = 'app:user';
const CACHE_EXPIRY_MINUTES = 60; // 1 hour

// Atoms for global state
export const currentUserAtom = atom<User | null>(null);
export const isLoadingUserAtom = atom<boolean>(false);
export const userErrorAtom = atom<string | null>(null);

export const userService = {
  /**
   * Получение текущего пользователя с приоритетом кэша
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Сначала пытаемся получить из кэша
      const cachedUser = storage.get<User>(USER_STORAGE_KEY);
      if (cachedUser) {
        return cachedUser;
      }

      // Если в кэше нет, пытаемся получить из Supabase
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      console.log('Session found:', session.session.user.id);

      // Запрашиваем данные пользователя
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.session.user.id)
        .maybeSingle();  // Используем maybeSingle вместо single

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      // Проверяем, есть ли пользователь
      if (!data) {
        console.log('No user found with id:', session.session.user.id);
        return null;
      }

      console.log('User data found:', data);

      // Сохраняем в кэш
      storage.set<User>(USER_STORAGE_KEY, data, CACHE_EXPIRY_MINUTES);
      return data;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  },

  /**
   * Регистрация с помощью email и пароля
   */
  async signUpWithEmail(
    email: string, 
    password: string, 
    name: string, 
    phone: string = '', 
    telegramId?: number
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('Signing up with email:', email);
      
      // Используем встроенную функцию Supabase для регистрации
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            telegram_id: telegramId
          },
        },
      });

      if (authError) {
        console.error('Auth error during signup:', authError);
        return { user: null, error: authError.message };
      }

      if (!authData?.user) {
        console.error('No user data returned from auth signup');
        return { user: null, error: 'Ошибка при создании пользователя' };
      }

      console.log('Auth signup successful, creating user record');

      // Используем переданный телефон или генерируем уникальный, если не указан
      const userPhone = phone || `user_${authData.user.id}`;

      // Создаем запись в нашей таблице users с помощью RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_record', {
        user_id: authData.user.id,
        user_email: email,
        user_name: name,
        user_phone: userPhone,
        user_telegram_id: telegramId
      });

      if (rpcError) {
        console.error('Error creating user record:', rpcError);
        
        // Если RPC не сработала, создаем запись напрямую
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            name: name,
            phone: userPhone,
            password_hash: 'auth_managed',
            created_at: new Date().toISOString(),
            telegram_id: telegramId,
            last_login: new Date().toISOString(),
            total_clicks: 50,
            games_owned: ['nut-catcher-game']
          });
        
        if (insertError) {
          console.error('Error inserting user record:', insertError);
        } else {
          console.log('User record created successfully via direct insert');
        }
      } else {
        console.log('User record created successfully:', rpcData);
      }

      // Получаем созданного пользователя
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();  // Используем maybeSingle вместо single

      if (userError) {
        console.error('Error fetching created user:', userError);
        
        // Создаем базовый объект пользователя из данных аутентификации
        const newUser: User = {
          id: authData.user.id,
          email: email,
          name: name,
          phone: userPhone,
          password_hash: 'auth_managed', // Пароли управляются Supabase Auth
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          total_clicks: 50,
          feed_clicks: 0,
          pet_clicks: 0,
          promo_codes_used: [],
          telegram_id: telegramId
        };

        // Кэшируем пользователя
        storage.set<User>(USER_STORAGE_KEY, newUser, CACHE_EXPIRY_MINUTES);
        
        // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
        localStorage.setItem('hasNutCatcherGame', 'true');
        
        return { user: newUser, error: null };
      }

      if (!userData) {
        console.log('No user data found after creation, creating default user object');
        
        // Создаем базовый объект пользователя если не найден
        const newUser: User = {
          id: authData.user.id,
          email: email,
          name: name,
          phone: userPhone,
          password_hash: 'auth_managed',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          total_clicks: 50,
          feed_clicks: 0,
          pet_clicks: 0,
          promo_codes_used: [],
          telegram_id: telegramId
        };

        // Кэшируем пользователя
        storage.set<User>(USER_STORAGE_KEY, newUser, CACHE_EXPIRY_MINUTES);
        
        // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
        localStorage.setItem('hasNutCatcherGame', 'true');
        
        return { user: newUser, error: null };
      }

      console.log('User data fetched after creation:', userData);

      // Начальные 50 монет для новых пользователей
      if (!userData.total_clicks && userData.total_clicks !== 0) {
        await this.updateUser(userData.id, { total_clicks: 50 });
        userData.total_clicks = 50;
      }
      
      // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
      localStorage.setItem('hasNutCatcherGame', 'true');

      // Кэшируем пользователя
      storage.set<User>(USER_STORAGE_KEY, userData, CACHE_EXPIRY_MINUTES);
      return { user: userData, error: null };
    } catch (error) {
      console.error('Error in signUpWithEmail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при регистрации';
      return { user: null, error: errorMessage };
    }
  },

  /**
   * Вход с помощью email и пароля
   */
  async signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('Signing in with email:', email);
      
      // Используем встроенную функцию Supabase для входа
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error during signin:', authError);
        // Улучшаем сообщение об ошибке
        if (authError.message === 'Invalid login credentials') {
          return { user: null, error: 'Неверный email или пароль. Пожалуйста, проверьте введенные данные.' };
        }
        return { user: null, error: authError.message };
      }

      if (!authData?.user) {
        console.error('No user data returned from auth signin');
        return { user: null, error: 'Ошибка при входе. Не удалось получить данные пользователя.' };
      }

      console.log('Auth signin successful, fetching user data');

      // После успешного входа получаем данные пользователя
      const { data, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();  // Используем maybeSingle вместо single

      if (userError) {
        console.error('Error fetching user:', userError);
        return { user: null, error: 'Ошибка при получении данных пользователя' };
      }

      // Проверяем, есть ли пользователь
      if (!data) {
        console.log('User not found, creating record for:', authData.user.id);
        
        // Генерируем уникальный идентификатор для телефона
        const uniquePhone = `user_${authData.user.id}`;
        
        // Если запись не найдена, создаем её
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_record', {
          user_id: authData.user.id,
          user_email: email,
          user_name: authData.user.user_metadata.name || email.split('@')[0],
          user_phone: uniquePhone
        });

        if (rpcError) {
          console.error('Error creating user record:', rpcError);
          
          // Если RPC не сработала, создаем запись напрямую
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: email,
              name: authData.user.user_metadata.name || email.split('@')[0],
              phone: uniquePhone,
              password_hash: 'auth_managed',
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              total_clicks: 50,
              games_owned: ['nut-catcher-game']
            })
            .select()
            .maybeSingle();
          
          if (insertError) {
            console.error('Error inserting user record:', insertError);
            
            // Создаем базовый объект пользователя для кэширования
            const newUser: User = {
              id: authData.user.id,
              email: email,
              name: authData.user.user_metadata.name || email.split('@')[0],
              phone: uniquePhone,
              password_hash: 'auth_managed',
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              total_clicks: 50,
              feed_clicks: 0,
              pet_clicks: 0,
              promo_codes_used: []
            };
            
            // Кэшируем пользователя
            storage.set<User>(USER_STORAGE_KEY, newUser, CACHE_EXPIRY_MINUTES);
            
            // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
            localStorage.setItem('hasNutCatcherGame', 'true');
            
            return { user: newUser, error: null };
          }
          
          if (insertData) {
            // Кэшируем пользователя
            storage.set<User>(USER_STORAGE_KEY, insertData, CACHE_EXPIRY_MINUTES);
            
            // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
            localStorage.setItem('hasNutCatcherGame', 'true');
            
            return { user: insertData, error: null };
          }
        }

        console.log('User record created successfully:', rpcData);

        // Пробуем еще раз получить данные
        const { data: newData, error: newUserError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();  // Используем maybeSingle вместо single

        if (newUserError) {
          console.error('Error fetching newly created user:', newUserError);
          return { user: null, error: 'Ошибка при получении данных пользователя' };
        }

        if (!newData) {
          console.log('Still no user data, creating default user object');
          
          // Создаем базовый объект пользователя
          const newUser: User = {
            id: authData.user.id,
            email: email,
            name: authData.user.user_metadata.name || email.split('@')[0],
            phone: uniquePhone,
            password_hash: 'auth_managed',
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            total_clicks: 50,
            feed_clicks: 0,
            pet_clicks: 0,
            promo_codes_used: []
          };
          
          // Кэшируем пользователя
          storage.set<User>(USER_STORAGE_KEY, newUser, CACHE_EXPIRY_MINUTES);
          
          // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
          localStorage.setItem('hasNutCatcherGame', 'true');
          
          return { user: newUser, error: null };
        }

        console.log('User data fetched after creation:', newData);

        // Обновляем время последнего входа
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', newData.id);
          
        // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
        localStorage.setItem('hasNutCatcherGame', 'true');

        // Кэшируем пользователя
        storage.set<User>(USER_STORAGE_KEY, newData, CACHE_EXPIRY_MINUTES);
        return { user: newData, error: null };
      }
      
      console.log('User data found:', data);
      
      // Обновляем время последнего входа
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);
        
      // Отмечаем, что у пользователя есть игра "Ловитель орехов" по умолчанию
      localStorage.setItem('hasNutCatcherGame', 'true');

      // Кэшируем пользователя
      storage.set<User>(USER_STORAGE_KEY, data, CACHE_EXPIRY_MINUTES);
      return { user: data, error: null };
    } catch (error) {
      console.error('Error in signInWithEmail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при входе';
      return { user: null, error: errorMessage };
    }
  },

  /**
   * Авторизация через Telegram WebApp
   */
  async signInWithTelegram(telegramData: any): Promise<{ 
    success: boolean; 
    error: string | null; 
    session?: any;
    token?: string;
  }> {
    try {
      console.log('userService: Отправляем данные Telegram на сервер:', JSON.stringify({
        userId: telegramData.telegramData.user?.id,
        username: telegramData.telegramData.user?.username,
        hasInitData: !!telegramData.telegramData.initData,
        hasInitDataUnsafe: !!telegramData.telegramData.initDataUnsafe,
        initDataLength: (telegramData.telegramData.initData || '').length
      }));
      
      // Проверяем, что данные пользователя существуют
      if (!telegramData.telegramData || (!telegramData.telegramData.user && !telegramData.telegramData.id)) {
        console.error('userService: Некорректные данные Telegram:', telegramData);
        return { success: false, error: 'Некорректные данные Telegram' };
      }

      // Вызываем Edge Function для верификации и авторизации
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(telegramData),
      });
      
      console.log('userService: Ответ от edge function:', response.status);
      
      if (!response.ok) {
        console.error('userService: Failed to call Telegram auth function. Status:', response.status);
        let errorMessage = 'Ошибка при авторизации через Telegram';
        try {
          const errorData = await response.json();
          console.error('userService: Ошибка edge function:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('userService: Не удалось распарсить ответ:', e);
        }
        return { success: false, error: errorMessage };
      }
      
      const data = await response.json();
      console.log('userService: Данные полученные от edge function:', {
        success: data.success,
        userId: data.user?.id,
        hasToken: !!data.token,
        hasSession: !!data.session,
        accessTokenLength: data.session?.access_token ? data.session.access_token.length : 0
      });
      
      if (!data.success || !data.session) {
        return { success: false, error: data.error || 'Не удалось получить данные сессии' };
      }
      
      // Возвращаем данные сессии и токен для использования в AuthContext
      return { 
        success: true, 
        error: null, 
        session: data.session,
        token: data.token
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при авторизации через Telegram';
      console.error('userService: Error in signInWithTelegram:', err);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Выход пользователя
   */
  async signOut(): Promise<void> {
    storage.remove(USER_STORAGE_KEY);
    await supabase.auth.signOut();
  },

  /**
   * Обновление данных пользователя
   */
  async updateUser(userId: string, data: Partial<User>): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
      }

      // Обновляем кэш
      const cachedUser = storage.get<User>(USER_STORAGE_KEY);
      if (cachedUser && cachedUser.id === userId) {
        storage.set<User>(
          USER_STORAGE_KEY, 
          { ...cachedUser, ...data }, 
          CACHE_EXPIRY_MINUTES
        );
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return { success: false, error: 'Произошла ошибка при обновлении пользователя' };
    }
  },

  /**
   * Обновление аватара пользователя
   */
  async updateAvatar(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Определяем тип файла и создаем имя
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${userId}/${fileName}`;
      
      // Загружаем файл в хранилище
      const { error: uploadError } = await supabase
        .storage
        .from('ava')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return { success: false, error: 'Ошибка при загрузке аватара' };
      }
      
      // Получаем публичную ссылку
      const { data: publicUrlData } = supabase
        .storage
        .from('ava')
        .getPublicUrl(filePath);
      
      if (!publicUrlData.publicUrl) {
        return { success: false, error: 'Не удалось получить URL аватара' };
      }
      
      // Обновляем URL аватара в профиле пользователя
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating user avatar URL:', updateError);
        return { success: false, error: 'Ошибка при обновлении URL аватара' };
      }
      
      // Обновляем кэш пользователя
      const cachedUser = storage.get<User>(USER_STORAGE_KEY);
      if (cachedUser && cachedUser.id === userId) {
        storage.set<User>(
          USER_STORAGE_KEY, 
          { ...cachedUser, avatar_url: publicUrlData.publicUrl }, 
          CACHE_EXPIRY_MINUTES
        );
      }
      
      return { success: true, url: publicUrlData.publicUrl };
    } catch (error) {
      console.error('Error in updateAvatar:', error);
      return { success: false, error: 'Произошла ошибка при обновлении аватара' };
    }
  },

  /**
   * Получение URL аватара пользователя
   */
  async getUserAvatarUrl(userId: string): Promise<string | null> {
    try {
      // Сначала проверяем в кэше
      const cachedUser = storage.get<User>(USER_STORAGE_KEY);
      if (cachedUser?.id === userId && cachedUser.avatar_url) {
        return cachedUser.avatar_url;
      }
      
      // Если в кэше нет, запрашиваем из базы
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();  // Используем maybeSingle вместо single
      
      if (error) {
        console.error('Error fetching user avatar URL:', error);
        return null;
      }
      
      return data?.avatar_url || null;
    } catch (error) {
      console.error('Error in getUserAvatarUrl:', error);
      return null;
    }
  },

  /**
   * Добавление предмета в список покупок пользователя
   */
  async addItemToUserInventory(userId: string, itemId: string): Promise<boolean> {
    try {
      // Если это игра, добавляем в games_owned
      if (itemId === 'nut-catcher-game') {
        // Получаем текущие данные пользователя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('games_owned')
          .eq('id', userId)
          .maybeSingle();  // Используем maybeSingle вместо single
          
        if (userError) {
          console.error('Error fetching user data:', userError);
          // Если возникла ошибка, но это игра, добавляем ее в localStorage
          localStorage.setItem('hasNutCatcherGame', 'true');
          return true;
        }
        
        if (!userData) {
          console.log('User data not found, adding game to localStorage only');
          localStorage.setItem('hasNutCatcherGame', 'true');
          return true;
        }
        
        // Обновляем games_owned
        const gamesOwned = userData.games_owned || [];
        if (!gamesOwned.includes(itemId)) {
          gamesOwned.push(itemId);
          
          // Обновляем пользователя в базе
          const { error: updateError } = await supabase
            .from('users')
            .update({ games_owned: gamesOwned })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating user games:', updateError);
            return false;
          }
        }
        
        // Также добавляем в localStorage для быстрого доступа
        localStorage.setItem('hasNutCatcherGame', 'true');
      }
      
      return true;
    } catch (error) {
      console.error('Error in addItemToUserInventory:', error);
      
      // В случае ошибки для игр добавляем в localStorage
      if (itemId === 'nut-catcher-game') {
        localStorage.setItem('hasNutCatcherGame', 'true');
        return true;
      }
      
      return false;
    }
  }
};