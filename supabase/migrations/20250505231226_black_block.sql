/*
  # Enhance Telegram auth support with better database schema

  1. Changes
     - Update create_user_record function to handle Telegram ID
     - Add get_user_by_telegram_id function
  
  2. Security
     - Ensure proper function permissions
*/

-- Update create_user_record function to properly handle Telegram ID
CREATE OR REPLACE FUNCTION create_user_record(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_phone TEXT DEFAULT NULL,
  user_telegram_id BIGINT DEFAULT NULL,
  user_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  phone_value TEXT;
BEGIN
  -- If phone not specified, generate unique value based on user ID
  IF user_phone IS NULL OR user_phone = '' THEN
    phone_value := 'user_' || user_id;
  ELSE
    phone_value := user_phone;
  END IF;

  -- Check if user with that phone already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = phone_value) THEN
    -- If exists, add random suffix
    phone_value := phone_value || '_' || floor(random() * 1000)::text;
  END IF;

  -- Insert user record or update if exists
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    phone, 
    password_hash,
    created_at,
    last_login,
    telegram_id,
    telegram_auth_date,
    avatar_url
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
    CASE WHEN user_telegram_id IS NOT NULL THEN now() ELSE NULL END,
    user_avatar_url
  )
  ON CONFLICT (id) DO 
    UPDATE SET 
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      phone = CASE WHEN users.phone SIMILAR TO 'user\\_%' THEN EXCLUDED.phone ELSE users.phone END,
      last_login = EXCLUDED.last_login,
      telegram_id = COALESCE(users.telegram_id, EXCLUDED.telegram_id),
      telegram_auth_date = CASE WHEN EXCLUDED.telegram_id IS NOT NULL THEN now() ELSE users.telegram_auth_date END,
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by Telegram ID
CREATE OR REPLACE FUNCTION get_user_by_telegram_id(
  p_telegram_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Get user by Telegram ID
  SELECT 
    id, name, email, phone, created_at, last_login, avatar_url, telegram_id
  INTO v_user
  FROM public.users
  WHERE telegram_id = p_telegram_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;
  
  RETURN jsonb_build_object(
    'exists', true,
    'user_id', v_user.id,
    'name', v_user.name,
    'email', v_user.email,
    'avatar_url', v_user.avatar_url,
    'phone', v_user.phone,
    'created_at', v_user.created_at,
    'last_login', v_user.last_login
  );
END;
$$;