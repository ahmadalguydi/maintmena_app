-- Ensure triggers are properly created
DROP TRIGGER IF EXISTS on_quote_submission ON quote_submissions;
CREATE TRIGGER on_quote_submission
  AFTER INSERT ON quote_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_submission();

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();