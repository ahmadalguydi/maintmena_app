-- Clean up legacy 'user' roles from user_roles table
-- Only keep buyer, buyer_individual, seller, and admin roles
DELETE FROM public.user_roles 
WHERE role NOT IN ('buyer', 'buyer_individual', 'seller', 'admin');