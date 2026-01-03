-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(id),
  quote_id UUID REFERENCES quote_submissions(id),
  booking_id UUID REFERENCES booking_requests(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | pending_buyer | pending_seller | pending_both | ready_to_sign | pending_signatures | fully_executed | completed | amended
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  buyer_accepted_version INTEGER,
  seller_accepted_version INTEGER,
  
  -- Language & content
  language_mode TEXT NOT NULL DEFAULT 'dual',
  -- dual | arabic_only | english_only
  html_snapshot TEXT,
  pdf_url TEXT,
  content_hash TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  signed_at_buyer TIMESTAMPTZ,
  signed_at_seller TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for contracts
CREATE INDEX idx_contracts_buyer ON contracts(buyer_id);
CREATE INDEX idx_contracts_seller ON contracts(seller_id);
CREATE INDEX idx_contracts_request ON contracts(request_id);
CREATE INDEX idx_contracts_quote ON contracts(quote_id);
CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- RLS for contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Both parties can update their contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create binding_terms table
CREATE TABLE public.binding_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Payment terms
  payment_schedule JSONB NOT NULL DEFAULT '{"deposit": 30, "progress": 40, "completion": 30}'::jsonb,
  use_deposit_escrow BOOLEAN DEFAULT false,
  
  -- Timeline
  start_date DATE,
  completion_date DATE,
  warranty_days INTEGER DEFAULT 90,
  
  -- Penalties & materials
  penalty_rate_per_day NUMERIC(10, 2),
  materials_by TEXT,
  
  -- Access & cleanup
  access_hours TEXT,
  cleanup_disposal BOOLEAN DEFAULT true,
  
  -- Additional terms
  custom_terms JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for binding_terms
ALTER TABLE binding_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view terms for their contracts"
  ON binding_terms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = binding_terms.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

CREATE POLICY "Both parties can manage binding terms"
  ON binding_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = binding_terms.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create contract_clauses table (Clause Library)
CREATE TABLE public.contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clause identification
  clause_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  service_tags TEXT[] DEFAULT '{}',
  
  -- Bilingual content
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  
  -- Merge variables
  variables TEXT[] DEFAULT '{}',
  
  -- Metadata
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for contract_clauses
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active clauses"
  ON contract_clauses FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage clauses"
  ON contract_clauses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create contract_versions table
CREATE TABLE public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Version content
  html_snapshot TEXT NOT NULL,
  binding_terms_snapshot JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  
  -- Changes
  changed_by UUID REFERENCES profiles(id),
  change_summary TEXT,
  changes_diff JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, version)
);

-- RLS for contract_versions
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their contracts"
  ON contract_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_versions.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create contract_signatures table
CREATE TABLE public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  version INTEGER NOT NULL,
  
  -- Signature details
  signature_method TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  otp_code TEXT,
  ip_address INET,
  user_agent TEXT,
  
  signed_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, user_id)
);

-- RLS for contract_signatures
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures on their contracts"
  ON contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_signatures.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can sign their own contracts"
  ON contract_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create contract_amendments table
CREATE TABLE public.contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  amendment_number INTEGER NOT NULL,
  
  -- Change details
  scope_delta TEXT,
  cost_delta NUMERIC(10, 2),
  time_delta INTEGER,
  
  -- Amendment contract
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  html_snapshot TEXT,
  pdf_url TEXT,
  
  -- Signatures
  signed_at_buyer TIMESTAMPTZ,
  signed_at_seller TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(parent_contract_id, amendment_number)
);

-- RLS for contract_amendments
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view amendments to their contracts"
  ON contract_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_amendments.parent_contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Notification trigger for contract creation
CREATE OR REPLACE FUNCTION notify_contract_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, notification_type, title, message, content_id)
  VALUES 
    (NEW.seller_id, 'contract_created', 'New Contract', 'A service contract has been created', NEW.id),
    (NEW.buyer_id, 'contract_created', 'New Contract', 'Your service contract is ready for review', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_created
  AFTER INSERT ON contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_created();

-- Notification trigger for contract version updates
CREATE OR REPLACE FUNCTION notify_contract_version_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version > OLD.version THEN
    INSERT INTO notifications (user_id, notification_type, title, message, content_id)
    VALUES 
      (CASE WHEN NEW.status = 'pending_buyer' THEN NEW.buyer_id ELSE NEW.seller_id END,
       'contract_updated', 'Contract Updated', 'Contract has been updated to version ' || NEW.version, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_version_updated
  AFTER UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_version_updated();