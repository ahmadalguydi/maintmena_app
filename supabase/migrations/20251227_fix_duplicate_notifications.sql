-- Drop duplicate triggers found in previous migrations
DROP TRIGGER IF EXISTS on_contract_created ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_version_updated ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts;

-- Improved notification function that checks auth.uid()
CREATE OR REPLACE FUNCTION public.notify_contract_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify seller if they didn't create it (prevent self-notification)
  IF NEW.seller_id != auth.uid() THEN
      INSERT INTO notifications (user_id, notification_type, title, message, content_id)
      VALUES (NEW.seller_id, 'contract_created', 'New Contract', 'A service contract has been created', NEW.id);
  END IF;

  -- Notify buyer if they didn't create it (prevent self-notification)
  IF NEW.buyer_id != auth.uid() THEN
      INSERT INTO notifications (user_id, notification_type, title, message, content_id)
      VALUES (NEW.buyer_id, 'contract_created', 'New Contract', 'Your service contract is ready for review', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate single trigger for creation
CREATE TRIGGER on_contract_created_notify
  AFTER INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_created();

-- Recreate single trigger for updates (ensuring no duplicates there either)
CREATE TRIGGER on_contract_version_updated_notify
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_version_updated();
