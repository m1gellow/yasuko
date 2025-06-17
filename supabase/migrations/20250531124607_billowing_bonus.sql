-- Добавление полей энергии в таблицу пользователей
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS current_energy INTEGER DEFAULT 100;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS max_energy INTEGER DEFAULT 100;

-- Функция для регенерации энергии пользователя
CREATE OR REPLACE FUNCTION regenerate_user_energy()
RETURNS TRIGGER AS $$
DECLARE
  v_time_diff INTERVAL;
  v_minutes_passed FLOAT;
  v_energy_to_add INTEGER;
  v_regen_rate INTEGER := 1; -- 1 энергия в минуту
BEGIN
  -- Вычисляем, сколько времени прошло с последнего входа
  IF OLD.last_login IS NOT NULL THEN
    v_time_diff := NOW() - OLD.last_login;
    v_minutes_passed := EXTRACT(EPOCH FROM v_time_diff) / 60;
    
    -- Вычисляем, сколько энергии нужно добавить
    v_energy_to_add := FLOOR(v_minutes_passed * v_regen_rate);
    
    -- Обновляем энергию, не превышая максимум
    IF v_energy_to_add > 0 THEN
      NEW.current_energy := LEAST(COALESCE(OLD.current_energy, 100) + v_energy_to_add, COALESCE(OLD.max_energy, 100));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической регенерации энергии при входе пользователя
DROP TRIGGER IF EXISTS regenerate_energy_on_login ON public.users;
CREATE TRIGGER regenerate_energy_on_login
  BEFORE UPDATE OF last_login ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION regenerate_user_energy();

-- Функция для регенерации энергии по запросу
CREATE OR REPLACE FUNCTION get_current_energy(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_energy INTEGER;
  v_max_energy INTEGER;
  v_last_login TIMESTAMP WITH TIME ZONE;
  v_time_diff INTERVAL;
  v_minutes_passed FLOAT;
  v_energy_to_add INTEGER;
  v_regen_rate INTEGER := 1; -- 1 энергия в минуту
BEGIN
  -- Получаем текущие данные пользователя
  SELECT current_energy, max_energy, last_login
  INTO v_current_energy, v_max_energy, v_last_login
  FROM public.users
  WHERE id = user_id;
  
  -- Если данные не найдены, возвращаем значение по умолчанию
  IF v_current_energy IS NULL THEN
    RETURN 100;
  END IF;
  
  -- Вычисляем, сколько времени прошло с последнего входа
  IF v_last_login IS NOT NULL THEN
    v_time_diff := NOW() - v_last_login;
    v_minutes_passed := EXTRACT(EPOCH FROM v_time_diff) / 60;
    
    -- Вычисляем, сколько энергии нужно добавить
    v_energy_to_add := FLOOR(v_minutes_passed * v_regen_rate);
    
    -- Обновляем энергию, не превышая максимум
    IF v_energy_to_add > 0 THEN
      v_current_energy := LEAST(v_current_energy + v_energy_to_add, COALESCE(v_max_energy, 100));
      
      -- Обновляем значение в базе данных
      UPDATE public.users
      SET current_energy = v_current_energy
      WHERE id = user_id;
    END IF;
  END IF;
  
  RETURN v_current_energy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии к функциям
COMMENT ON FUNCTION regenerate_user_energy() IS 'Автоматически регенерирует энергию пользователя при входе в систему';
COMMENT ON FUNCTION get_current_energy(UUID) IS 'Возвращает текущее значение энергии пользователя с учетом времени, прошедшего с последнего входа';