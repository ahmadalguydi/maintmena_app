-- Create a function to auto-confirm users
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$;

-- Create a trigger that runs before the user is inserted
drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row execute procedure public.auto_confirm_user();
