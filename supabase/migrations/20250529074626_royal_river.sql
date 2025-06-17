-- Функция для создания записи в public.users при регистрации пользователя через Telegram
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_telegram_id BIGINT;
  v_name TEXT;
  v_username TEXT;
  v_avatar_url TEXT;
  v_timestamp TIMESTAMP WITH TIME ZONE;
  v_email TEXT;
BEGIN
  -- Получаем текущую временную метку
  v_timestamp := NOW();
  
  -- Извлекаем данные Telegram из метаданных пользователя
  IF NEW.raw_user_meta_data ? 'telegram_id' THEN
    -- Получаем telegram_id, имя и другие данные из метаданных
    v_telegram_id := (NEW.raw_user_meta_data->>'telegram_id')::BIGINT;
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Telegram User ' || (NEW.raw_user_meta_data->>'telegram_id'));
    v_username := NEW.raw_user_meta_data->>'telegram_username';
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Если email не задан, создаем его на основе telegram_id
    v_email := COALESCE(NEW.email, 'telegram' || (NEW.raw_user_meta_data->>'telegram_id') || '@example.com');
    
    -- Пробуем найти существующего пользователя по telegram_id
    IF EXISTS (SELECT 1 FROM public.users WHERE telegram_id = v_telegram_id) THEN
      -- Обновляем существующую запись
      UPDATE public.users
      SET 
        name = COALESCE(v_name, name),
        email = COALESCE(v_email, email),
        username = COALESCE(v_username, username),
        last_login = v_timestamp,
        telegram_auth_date = v_timestamp,
        avatar_url = COALESCE(v_avatar_url, avatar_url)
      WHERE telegram_id = v_telegram_id;
      
      -- Записываем событие обновления пользователя
      INSERT INTO public.user_stats(
        user_id,
        action,
        timestamp,
        data
      ) VALUES (
        NEW.id,
        'idle',
        v_timestamp,
        jsonb_build_object('event', 'telegram_user_updated', 'source', 'auth_trigger')
      );
    ELSE
      -- Создаем нового пользователя
      INSERT INTO public.users (
        id,
        name,
        email,
        phone,
        password_hash,
        created_at,
        last_login,
        telegram_id,
        telegram_auth_date,
        avatar_url,
        status,
        total_clicks,
        feed_clicks,
        pet_clicks,
        promo_codes_used,
        games_owned,
        user_role,
        username
      )
      VALUES (
        NEW.id,
        v_name,
        v_email,
        'tg_' || v_telegram_id,
        'auth_managed',
        v_timestamp,
        v_timestamp,
        v_telegram_id,
        v_timestamp,
        v_avatar_url,
        'Привет, мир!',
        50,  -- Начальные монеты
        0,
        0,
        '[]'::jsonb,
        '["nut-catcher-game"]'::jsonb,  -- Пользователь сразу получает игру
        'user',
        v_username
      );
      
      -- Записываем событие создания пользователя
      INSERT INTO public.user_stats(
        user_id,
        action,
        timestamp,
        data
      ) VALUES (
        NEW.id,
        'idle',
        v_timestamp,
        jsonb_build_object('event', 'telegram_user_created', 'source', 'auth_trigger')
      );
    END IF;
  ELSE
    -- Если нет данных Telegram, ничего не делаем
    -- Предполагается, что обычная регистрация обрабатывается другой логикой
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION handle_new_auth_user() IS 
'Создает запись в таблице public.users при регистрации пользователя через Telegram';

-- Создаем триггер для автоматического создания профиля при регистрации пользователя через Telegram
-- Убедимся, что триггер не существует перед созданием
DROP TRIGGER IF EXISTS create_telegram_profile_trigger ON auth.users;

-- Создаем триггер на таблице auth.users
CREATE TRIGGER create_telegram_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();