-- Ensure the trigger exists to call handle_new_user on auth.users insert
-- This trigger creates user profiles, roles, and trial subscriptions at signup

-- Drop existing trigger if it exists (to ensure clean recreation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();