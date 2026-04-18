import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getNotificationPresentation, getNotificationTarget, notificationQueryKeys, type AppNotification } from '@/lib/notifications';
import { InAppNotificationBanner } from '@/components/mobile/InAppNotificationBanner';

type NotificationRow = Pick<AppNotification, 'notification_type' | 'title' | 'message'> & { id?: string; content_id?: string | null };

// Module-level dedup: prevent toasting the same notification twice on channel reconnect
const recentlyToastedIds = new Set<string>();
const DEDUP_TTL_MS = 30_000;

/**
 * Centralized Realtime Hub
 *
 * Consolidates all user-specific subscriptions into a single WebSocket connection
 * to prevent connection limit exhaustion at scale.
 *
 * Tables in Realtime publication: maintenance_requests, job_dispatch_offers,
 *   notifications, messages
 */
export function useRealtimeHub() {
    const { user, userType } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel(`user-hub:${user.id}`)

            // ── 1. Notifications — bell badge + in-app banners ─────────────────
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
                    queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });
                    queryClient.invalidateQueries({ queryKey: ['nav-unread-messages', user.id] });

                    const n = payload.new as NotificationRow | null;
                    if (!n?.notification_type) return;

                    // Dedup: skip if we already toasted this notification recently
                    const nId = n.id || `${n.notification_type}_${Date.now()}`;
                    if (recentlyToastedIds.has(nId)) return;
                    recentlyToastedIds.add(nId);
                    setTimeout(() => recentlyToastedIds.delete(nId), DEDUP_TTL_MS);

                    const lang = (
                        localStorage.getItem('preferredLanguage') ||
                        localStorage.getItem('currentLanguage') ||
                        'ar'
                    ) as 'en' | 'ar';
                    const effectiveUserType = userType === 'seller' ? 'seller' : 'buyer';
                    const presentation = getNotificationPresentation(n, lang);
                    const actionPath = getNotificationTarget(
                        { notification_type: n.notification_type, content_id: n.content_id ?? null },
                        effectiveUserType,
                    );

                    // ── Banner suppression ────────────────────────────────────────
                    // Read window.location directly — avoids any React state/ref lag
                    // after navigation.
                    const currentPath = window.location.pathname + window.location.search;
                    const isOnMessagesScreen = currentPath.includes('/messages');
                    const isOnSameThread =
                        n.notification_type === 'new_message' &&
                        n.content_id != null &&
                        currentPath.includes(`request=${n.content_id}`);

                    if (!isOnMessagesScreen && !isOnSameThread) {
                        toast.custom(
                            (toastId) =>
                                InAppNotificationBanner({
                                    notification: {
                                        id: String(toastId),
                                        icon: presentation.icon,
                                        title: presentation.title,
                                        message: presentation.message,
                                        actionPath,
                                    },
                                    onDismiss: () => toast.dismiss(toastId),
                                    onAction: (path) => { toast.dismiss(toastId); navigate(path); },
                                    currentLanguage: lang,
                                }),
                            { duration: 6000 }
                        );
                    }
                }
            )

            // ── 2. Direct message delivery — no rate limit ─────────────────────
            // Notifications above are burst-suppressed to 1 per 30 s per thread.
            // This subscription fires for EVERY received message, so the thread
            // and hub cache refresh immediately regardless of burst frequency.
            // recipient_id is auto-populated by the DB trigger on messages INSERT.
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${user.id}`,
                },
                (payload) => {
                    const requestId = (payload.new as { request_id?: string }).request_id;
                    if (!requestId) return;
                    queryClient.invalidateQueries({ queryKey: ['messages', requestId], exact: false });
                    queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['nav-unread-messages', user.id] });
                }
            )

            // ── 3. Maintenance requests — buyer side (requests I created) ───────
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'maintenance_requests',
                    filter: `buyer_id=eq.${user.id}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
                    queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
                    queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['message-request-scopes', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
                    const requestId =
                        (payload.new as { id?: string } | null)?.id ||
                        (payload.old as { id?: string } | null)?.id;
                    if (requestId) {
                        queryClient.invalidateQueries({ queryKey: ['request-tracking', requestId] });
                        queryClient.invalidateQueries({ queryKey: ['request-detail', requestId] });
                    }
                }
            )

            // ── 4. Maintenance requests — seller side (requests assigned to me) ─
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'maintenance_requests',
                    filter: `assigned_seller_id=eq.${user.id}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['seller-active-job', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-job-detail'] });
                    queryClient.invalidateQueries({ queryKey: ['message-request-scopes', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
                    const requestId =
                        (payload.new as { id?: string } | null)?.id ||
                        (payload.old as { id?: string } | null)?.id;
                    if (requestId) {
                        queryClient.invalidateQueries({ queryKey: ['request-detail', requestId] });
                    }
                }
            )

            // ── 5. Dispatch offers — seller receives new opportunities ───────────
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'job_dispatch_offers',
                    filter: `seller_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['seller-opportunities', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient, navigate]);
}
