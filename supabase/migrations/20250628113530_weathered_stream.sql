/*
  # Fix users table INSERT policy

  1. Security Changes
    - Drop existing INSERT policy that may be using incorrect function
    - Create new INSERT policy using correct auth.uid() function
    - Ensure authenticated users can insert their own profile data

  The issue is that the current INSERT policy for the users table is preventing
  new user profiles from being created during signup. This migration fixes the
  RLS policy to allow authenticated users to insert their own profile.
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new INSERT policy with correct auth.uid() function
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the policy is working by also updating other policies to use consistent naming
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);