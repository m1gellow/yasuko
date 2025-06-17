-- Исправление реферальной системы
-- 1. Создание новой функции для отслеживания использования реферальных ссылок
-- 2. Интеграция с системой пользователей

-- Обновляем функцию use_referral_code для правильной обработки реферальных ссылок
CREATE OR REPLACE FUNCTION public.use_referral_code(
  p_code TEXT,
  p_user_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_reward JSONB;
  v_is_active BOOLEAN;
  v_max_uses INT;
  v_use_count INT;
  v_expires_at TIMESTAMPTZ;
  v_result JSONB;
  v_use_id UUID;
BEGIN
  -- Ищем реферальную ссылку по коду
  SELECT id, user_id, reward, is_active, max_uses, use_count, expires_at
  INTO v_referral_id, v_referrer_id, v_reward, v_is_active, v_max_uses, v_use_count, v_expires_at
  FROM public.referral_links
  WHERE code = p_code;
  
  -- Если ссылка не найдена
  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Реферальный код не найден'
    );
  END IF;
  
  -- Если ссылка неактивна
  IF NOT v_is_active THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Реферальный код деактивирован'
    );
  END IF;
  
  -- Если срок действия истек
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Срок действия реферального кода истек'
    );
  END IF;
  
  -- Если достигнуто максимальное количество использований
  IF v_max_uses IS NOT NULL AND v_use_count >= v_max_uses THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Достигнуто максимальное количество использований кода'
    );
  END IF;
  
  -- Если пользователь пытается использовать свой же код
  IF v_referrer_id = p_user_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Вы не можете использовать свой собственный реферальный код'
    );
  END IF;
  
  -- Проверяем, не использовал ли уже пользователь этот код
  IF EXISTS (
    SELECT 1 
    FROM public.referral_uses
    WHERE referral_id = v_referral_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Вы уже использовали этот реферальный код'
    );
  END IF;
  
  -- Создаем запись об использовании реферального кода
  INSERT INTO public.referral_uses (
    referral_id,
    user_id,
    ip_address,
    reward_claimed
  )
  VALUES (
    v_referral_id,
    p_user_id,
    p_ip_address,
    TRUE -- Сразу помечаем награду как полученную
  )
  RETURNING id INTO v_use_id;
  
  -- Увеличиваем счетчик использований кода
  UPDATE public.referral_links
  SET use_count = use_count + 1
  WHERE id = v_referral_id;
  
  -- Начисляем бонусы пользователю, использовавшему код
  -- Обновляем total_clicks для пользователя, если в награде есть монеты
  IF (v_reward->>'coins')::INT > 0 THEN
    UPDATE public.users
    SET total_clicks = total_clicks + (v_reward->>'coins')::INT
    WHERE id = p_user_id;
    
    -- Создаем уведомление о полученном бонусе
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data
    )
    VALUES (
      p_user_id,
      'reward',
      'Бонус за реферальную ссылку!',
      'Вы получили ' || (v_reward->>'coins')::TEXT || ' монет за использование реферального кода!',
      jsonb_build_object(
        'reward_type', 'referral_bonus',
        'referral_code', p_code,
        'coins', (v_reward->>'coins')::INT,
        'energy', (v_reward->>'energy')::INT
      )
    );
  END IF;

  -- Начисляем бонусы владельцу реферальной ссылки
  -- Это награда за привлечение пользователя
  IF v_referrer_id IS NOT NULL AND v_referrer_id != p_user_id THEN
    -- Обновляем total_clicks для владельца ссылки, если в награде есть монеты
    IF (v_reward->>'coins')::INT > 0 THEN
      UPDATE public.users
      SET total_clicks = total_clicks + (v_reward->>'coins')::INT
      WHERE id = v_referrer_id;
      
      -- Создаем уведомление о полученном бонусе за привлечение пользователя
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      )
      VALUES (
        v_referrer_id,
        'reward',
        'Бонус за приглашение!',
        'Ваш друг зарегистрировался по вашей ссылке! Вы получили ' || (v_reward->>'coins')::TEXT || ' монет.',
        jsonb_build_object(
          'reward_type', 'referral_reward',
          'referral_code', p_code,
          'coins', (v_reward->>'coins')::INT,
          'energy', (v_reward->>'energy')::INT
        )
      );
    END IF;
  END IF;
  
  -- Возвращаем успешный результат
  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'Реферальный код успешно использован',
    'reward', v_reward,
    'referrer_id', v_referrer_id
  );
  
  RETURN v_result;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.use_referral_code(text, uuid, text) IS 
'Обрабатывает использование реферального кода и начисляет награды пользователям';

-- Функция для поиска или создания персонажа для пользователя
CREATE OR REPLACE FUNCTION public.find_or_create_character(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_character_id UUID;
  v_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Проверяем существует ли уже персонаж
  SELECT id INTO v_character_id
  FROM public.character
  WHERE id = p_user_id;
  
  -- Если персонаж не найден, создаем нового
  IF v_character_id IS NULL THEN
    INSERT INTO public.character (
      id,
      name,
      created_at,
      rating,
      satiety,
      mood,
      last_interaction
    ) VALUES (
      p_user_id,
      'Тамагочи',
      v_timestamp,
      0,
      50,
      50,
      v_timestamp
    )
    RETURNING id INTO v_character_id;
    
    -- Логируем создание персонажа
    INSERT INTO public.user_stats (
      user_id,
      action,
      timestamp,
      data
    ) VALUES (
      p_user_id,
      'idle',
      v_timestamp,
      jsonb_build_object('event', 'character_created', 'source', 'find_or_create_function')
    );
  END IF;
  
  RETURN v_character_id;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.find_or_create_character(uuid) IS 
'Находит существующего персонажа или создает нового для указанного пользователя';

-- Функция обработки регистрации через реферальную ссылку
CREATE OR REPLACE FUNCTION public.handle_referral_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref_code TEXT;
  v_result JSONB;
BEGIN
  -- Получаем ref из метаданных пользователя
  v_ref_code := NEW.raw_user_meta_data->>'ref_code';
  
  -- Если ref_code существует в метаданных, обрабатываем его
  IF v_ref_code IS NOT NULL THEN
    -- Вызываем функцию использования реферального кода
    v_result := public.use_referral_code(v_ref_code, NEW.id, NULL);
    
    -- Логируем результат
    INSERT INTO public.user_stats (
      user_id,
      action,
      timestamp,
      data
    ) VALUES (
      NEW.id,
      'idle',
      NOW(),
      jsonb_build_object('event', 'referral_code_used', 'code', v_ref_code, 'result', v_result)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Создаем триггер на auth.users для обработки реферальной регистрации
DROP TRIGGER IF EXISTS handle_referral_registration_trigger ON auth.users;
CREATE TRIGGER handle_referral_registration_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_registration();

-- Комментарий к функции
COMMENT ON FUNCTION public.handle_referral_registration() IS 
'Обрабатывает реферальные коды при регистрации нового пользователя';