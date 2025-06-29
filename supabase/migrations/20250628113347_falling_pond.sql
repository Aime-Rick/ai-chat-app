/*
  # Fix users table RLS policies

  1. Security
    - Add missing INSERT policy for users table to allow authenticated users to create their own profile
    - This fixes the RLS violation error when new users try to sign up

  The policy ensures that authenticated users can only insert a profile for their own user ID.
*/

-- Add INSERT policy for users table
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);