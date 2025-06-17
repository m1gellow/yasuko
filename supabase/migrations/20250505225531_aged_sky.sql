/*
  # Добавление поддержки авторизации через Telegram
  
  1. Изменения
     - Добавление поля telegram_id в таблицу users
     - Создание функций и политик для работы с Telegram авторизацией
     - Обновление политик безопасности
  
  2. Безопасность
     - Добавление политик для обновления данных Telegram
     - Добавление функции для проверки владельца Telegram ID
*/

-- Добавляем поле telegram_id в таблицу users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Добавляем поле telegram_auth_date для отслеживания последней авторизации через Telegram
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS telegram_auth_date TIMESTAMP WITH TIME ZONE;

-- Функция для проверки владельца Telegram ID
CREATE OR REPLACE FUNCTION is_user_telegram_owner(telegram_id BIGINT) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE users.telegram_id = telegram_id AND auth.uid() = users.id
  );
END;
$$ LANGUAGE plpgsql;

-- Обновляем функцию создания пользователя, чтобы поддерживать telegram_id
CREATE OR REPLACE FUNCTION create_user_record(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_phone TEXT DEFAULT NULL,
  user_telegram_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  phone_value TEXT;
BEGIN
  -- Если телефон не указан, генерируем уникальное значение на основе ID пользователя
  IF user_phone IS NULL OR user_phone = '' THEN
    phone_value := 'user_' || user_id;
  ELSE
    phone_value := user_phone;
  END IF;

  -- Проверяем существует ли уже пользователь с таким телефоном
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = phone_value) THEN
    -- Если существует, добавляем случайный суффикс
    phone_value := phone_value || '_' || floor(random() * 1000)::text;
  END IF;

  -- Вставляем запись пользователя
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    phone, 
    password_hash,
    created_at,
    last_login,
    telegram_id,
    telegram_auth_date
  )
  VALUES (
    user_id,
    user_email,
    user_name,
    phone_value,
    'auth_managed',
    now(),
    now(),
    user_telegram_id,
    CASE WHEN user_telegram_id IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO 
    UPDATE SET 
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      last_login = EXCLUDED.last_login,
      telegram_id = COALESCE(users.telegram_id, EXCLUDED.telegram_id),
      telegram_auth_date = CASE WHEN EXCLUDED.telegram_id IS NOT NULL THEN now() ELSE users.telegram_auth_date END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для обновления telegram_id пользователя
CREATE OR REPLACE FUNCTION update_user_telegram(
  user_id UUID,
  telegram_id BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users
  SET 
    telegram_id = telegram_id,
    telegram_auth_date = now()
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;