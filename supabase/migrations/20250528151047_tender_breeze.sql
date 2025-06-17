-- Create function to create character for new user
CREATE OR REPLACE FUNCTION create_character_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current timestamp
  v_timestamp := NOW();
  
  -- Check if character already exists for this user
  IF NOT EXISTS (SELECT 1 FROM public.character WHERE id = NEW.id) THEN
    -- Create new character record
    INSERT INTO public.character(
      id,
      name,
      created_at,
      rating,
      satiety,
      mood,
      last_interaction
    ) VALUES (
      NEW.id,
      'Тамагочи',
      v_timestamp,
      0,
      50,
      50,
      v_timestamp
    );
    
    -- Log character creation
    INSERT INTO public.user_stats(
      user_id,
      action,
      timestamp,
      data
    ) VALUES (
      NEW.id,
      'idle',
      v_timestamp,
      jsonb_build_object('event', 'character_created', 'source', 'trigger')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on users table for automatic character creation
DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_character_for_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION create_character_for_new_user() IS 
'Creates a new character record when a new user is registered';

-- Verify function and trigger existence for testing (commented out to avoid potential execution issues)
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_character_for_new_user';
-- SELECT * FROM pg_trigger WHERE tgname = 'on_user_created';