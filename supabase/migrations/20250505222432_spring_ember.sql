/*
  # Добавление функции для отслеживания действий пользователей
  
  1. Изменения
     - Добавление функции track_user_action с четко определенным порядком параметров
     - Добавление упрощенной функции для отслеживания действий текущего пользователя
  
  2. Безопасность
     - Функции имеют атрибут SECURITY DEFINER для выполнения с правами создателя
     - Четко определенный порядок параметров для избежания путаницы
*/

-- Удаляем существующие версии функции, если они есть
DROP FUNCTION IF EXISTS public.track_user_action(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.track_user_action(text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.track_user_action(text, jsonb);
DROP FUNCTION IF EXISTS public.track_current_user_action(text, jsonb);

-- Создаем одну стандартную версию функции с четко определенным порядком параметров
CREATE OR REPLACE FUNCTION public.track_user_action(
  p_user_id UUID,      -- ID пользователя - всегда первый параметр
  p_action TEXT,       -- Действие - всегда второй параметр
  p_details JSONB DEFAULT '{}'::jsonb  -- Детали - всегда третий параметр
) RETURNS UUID AS $$
DECLARE
  action_id UUID;
BEGIN
  -- Вставка записи в таблицу статистики
  INSERT INTO public.user_stats (
    user_id,
    action,
    data,
    timestamp
  ) VALUES (
    p_user_id,
    p_action,
    p_details,
    now()
  ) RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции для документации
COMMENT ON FUNCTION public.track_user_action(uuid, text, jsonb) IS 
'Отслеживает действия пользователя. Порядок параметров всегда: p_user_id, p_action, p_details.';

-- Создаем дополнительную функцию с аутентификацией через auth.uid() для удобства
CREATE OR REPLACE FUNCTION public.track_current_user_action(
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
BEGIN
  RETURN public.track_user_action(auth.uid(), p_action, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции для документации
COMMENT ON FUNCTION public.track_current_user_action(text, jsonb) IS 
'Отслеживает действия текущего пользователя. Автоматически использует auth.uid().';