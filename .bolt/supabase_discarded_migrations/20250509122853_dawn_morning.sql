/*
  # Создание функции для сервисной обработки персонажей
  
  1. Изменения:
     - Создание функции для поиска или создания персонажа
     - Функция доступна через публичный API и не требует специальных прав
  
  2. Безопасность:
     - Функция не использует SECURITY DEFINER для снижения требуемых привилегий
*/

-- Создаем функцию для поиска или создания персонажа для пользователя
CREATE OR REPLACE FUNCTION public.find_or_create_character(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_character_id UUID;
  v_character JSONB;
  current_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Получаем текущее время
  current_timestamp := NOW();
  
  -- Проверяем, есть ли уже персонаж у этого пользователя
  SELECT id INTO v_character_id FROM public.character WHERE id = p_user_id;
  
  -- Если персонаж не найден, создаем его
  IF v_character_id IS NULL THEN
    -- Создаем запись в таблице character
    INSERT INTO public.character(
      id,
      name,
      created_at,
      rating,
      satiety,
      mood,
      life_power,
      last_interaction
    ) VALUES (
      p_user_id,
      'Тамагочи',
      current_timestamp,
      0,
      50,
      50,
      50,
      current_timestamp
    )
    RETURNING id INTO v_character_id;
    
    -- Записываем информацию о создании персонажа
    BEGIN
      INSERT INTO public.user_stats(
        user_id,
        action,
        timestamp,
        data
      ) VALUES (
        p_user_id,
        'idle',
        current_timestamp,
        jsonb_build_object('event', 'character_created', 'source', 'function')
      );
    EXCEPTION WHEN OTHERS THEN
      -- Игнорируем ошибки при записи статистики
      NULL;
    END;
    
    v_character := jsonb_build_object(
      'id', v_character_id,
      'created', true,
      'timestamp', current_timestamp
    );
  ELSE
    -- Персонаж уже существует
    v_character := jsonb_build_object(
      'id', v_character_id,
      'created', false
    );
  END IF;
  
  RETURN v_character;
END;
$$;

-- Комментарий для документации
COMMENT ON FUNCTION public.find_or_create_character(UUID) IS 
'Ищет персонажа для указанного пользователя, и если не находит - создает нового.';