-- Enable read access for all authenticated users to view profiles
-- This is necessary for buyers to see seller information (name, avatar, rating) in quotes.

create policy "Profiles are viewable by everyone"
on "public"."profiles"
for select
to authenticated
using ( true );

-- Also allow public access if needed for unauthenticated views (optional, but sticking to authenticated for now)
-- If the app allows unauthenticated browsing of requests/quotes, we might need 'public' role too.
