-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  service_type TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  location TEXT NOT NULL,
  facility_type TEXT,
  estimated_budget_min NUMERIC,
  estimated_budget_max NUMERIC,
  budget NUMERIC,
  project_duration_days INTEGER,
  scope_of_work TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  preferred_start_date TIMESTAMP WITH TIME ZONE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quote_submissions table
CREATE TABLE IF NOT EXISTS public.quote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  estimated_duration TEXT NOT NULL,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create saved_requests table
CREATE TABLE IF NOT EXISTS public.saved_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(seller_id, request_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS verified_seller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_rating NUMERIC DEFAULT 0;

-- Enable RLS on all tables
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_requests
CREATE POLICY "Buyers can manage their own requests" 
  ON public.maintenance_requests 
  FOR ALL 
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view public open requests" 
  ON public.maintenance_requests 
  FOR SELECT 
  USING (visibility = 'public' AND status = 'open');

CREATE POLICY "Admins can manage all requests" 
  ON public.maintenance_requests 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quote_submissions
CREATE POLICY "Sellers can create quotes" 
  ON public.quote_submissions 
  FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can view their own quotes" 
  ON public.quote_submissions 
  FOR SELECT 
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view quotes for their requests" 
  ON public.quote_submissions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = quote_submissions.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can update quote status" 
  ON public.quote_submissions 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = quote_submissions.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    )
  );

-- RLS Policies for saved_requests
CREATE POLICY "Sellers can manage their saved requests" 
  ON public.saved_requests 
  FOR ALL 
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages for their requests" 
  ON public.messages 
  FOR SELECT 
  USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = messages.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.quote_submissions 
      WHERE quote_submissions.request_id = messages.request_id 
      AND quote_submissions.seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Add updated_at triggers
CREATE TRIGGER update_maintenance_requests_updated_at 
  BEFORE UPDATE ON public.maintenance_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_quote_submissions_updated_at 
  BEFORE UPDATE ON public.quote_submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_id ON public.maintenance_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_request_id ON public.quote_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_id ON public.quote_submissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_saved_requests_seller_id ON public.saved_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_request_id ON public.messages(request_id);