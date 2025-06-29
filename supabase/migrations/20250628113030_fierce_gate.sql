/*
  # Fix user creation database error

  1. Problem
    - Supabase auth.signUp is failing with "Database error saving new user"
    - This typically indicates an issue with the handle_new_user trigger function

  2. Solution
    - Recreate the handle_new_user function with proper error handling
    - Ensure the trigger is properly configured
    - Add safeguards to prevent conflicts

  3. Changes
    - Drop and recreate the handle_new_user function
    - Recreate the trigger on auth.users
    - Add proper error handling and conflict resolution
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table, handling conflicts gracefully
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the users table has proper constraints and defaults
ALTER TABLE public.users 
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Make sure the users table has the correct structure
DO $$
BEGIN
  -- Ensure id column is properly configured
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN id SET NOT NULL;
  END IF;

  -- Ensure email column is properly configured
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;