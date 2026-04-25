import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const db = supabase as unknown as SupabaseClient;

function isMissingRpcError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string; details?: string; status?: number };
  const text = `${err.code ?? ''} ${err.message ?? ''} ${err.details ?? ''}`.toLowerCase();
  return err.status === 404 || text.includes('pgrst202') || text.includes('could not find the function');
}

export async function markRequestMessagesRead(requestId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error: updateError } = await (db as any)
    .from('messages')
    .update({ is_read: true, read_at: now, updated_at: now })
    .eq('request_id', requestId)
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (updateError) throw updateError;

  await (db as any)
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('notification_type', 'new_message')
    .eq('content_id', requestId)
    .eq('read', false);
}

export async function markAllRequestMessagesRead(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error: updateError } = await (db as any)
    .from('messages')
    .update({ is_read: true, read_at: now, updated_at: now })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (updateError) throw updateError;

  await (db as any)
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('notification_type', 'new_message')
    .eq('read', false);
}

export { isMissingRpcError };
