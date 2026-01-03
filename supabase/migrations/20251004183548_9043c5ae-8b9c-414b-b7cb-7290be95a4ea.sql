-- Step 2: Create policies allowing self-assign buyer/seller and optional profile insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' 
      AND policyname = 'Users can set themselves as buyer or seller'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can set themselves as buyer or seller" 
      ON public.user_roles 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id AND role IN (''buyer'',''seller''))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Users can create their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create their own profile" 
      ON public.profiles 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = id)';
  END IF;
END $$;