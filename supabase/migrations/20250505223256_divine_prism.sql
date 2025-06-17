-- Функция для отслеживания действий пользователя
CREATE OR REPLACE FUNCTION public.track_user_action(
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Вставляем данные в user_stats
  INSERT INTO public.user_stats (
    user_id,
    action,
    data,
    timestamp
  ) VALUES (
    p_user_id,
    CASE 
      -- Если это стандартное действие - используем его как есть
      WHEN p_action IN ('click', 'feed', 'pet', 'idle') THEN p_action
      -- Иначе используем 'idle' для поддержки RLS
      ELSE 'idle'
    END,
    p_details || jsonb_build_object('original_action', p_action),
    NOW()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Комментарий для документации
COMMENT ON FUNCTION public.track_user_action(uuid, text, jsonb) IS 
'Отслеживает действия пользователя, обходя ограничение на типы действий в таблице user_stats.';