-- Migration to update energy regeneration to 1 energy every 3 minutes

-- Update regenerate_user_energy function to regenerate 1 energy every 3 minutes
CREATE OR REPLACE FUNCTION regenerate_user_energy()
RETURNS TRIGGER AS $$
DECLARE
  v_time_diff INTERVAL;
  v_minutes_passed FLOAT;
  v_energy_to_add INTEGER;
  v_regen_rate FLOAT := 0.333; -- 1 энергия каждые 3 минуты (1/3 энергии в минуту)
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

-- Drop the get_current_energy function as it's no longer needed
DROP FUNCTION IF EXISTS public.get_current_energy(UUID);

-- Comment on the updated function
COMMENT ON FUNCTION regenerate_user_energy() IS 'Автоматически регенерирует энергию пользователя при входе в систему (1 единица за 3 минуты)';