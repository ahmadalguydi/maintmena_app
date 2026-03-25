import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarBadge } from '@/components/mobile/AvatarBadge';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseRelationKnownUnavailable } from '@/lib/supabaseSchema';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import { cn } from '@/lib/utils';

interface MessagesHubProps {
  currentLanguage: 'en' | 'ar';
}

interface Conversation {
  id: string;
  request_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  other_user_name: string;
  other_user_avatar?: string;
}

interface RequestMessageScope {
  id: string;
  buyer_id: string;
  assigned_seller_id: string | null;
}

const MessagesHub = ({ currentLanguage }: MessagesHubProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isArabic = currentLanguage === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const pendingRefetchTimeoutRef = useRef<number | null>(null);
  const requestIdsRef = useRef<string[]>([]);

  const { data: requestScopes = [] } = useQuery({
    queryKey: ['message-request-scopes', user?.id],
    queryFn: async (): Promise<RequestMessageScope[]> => {
      if (!user?.id) return [];

      const [buyerRequests, assignedRequests] = await Promise.all([
        executeSupabaseQuery<any[]>(
          () =>
            (supabase as any)
              .from('maintenance_requests')
              .select('id, buyer_id, assigned_seller_id')
              .eq('buyer_id', user.id),
          {
            context: 'messages-hub-buyer-requests',
            fallbackData: [],
            relationName: 'maintenance_requests',
          },
        ),
        executeSupabaseQuery<any[]>(
          () =>
            (supabase as any)
              .from('maintenance_requests')
              .select('id, buyer_id, assigned_seller_id')
              .eq('assigned_seller_id', user.id),
          {
            context: 'messages-hub-assigned-requests',
            fallbackData: [],
            relationName: 'maintenance_requests',
          },
        ),
      ]);

      const requestMap = new Map<string, RequestMessageScope>();
      [...buyerRequests, ...assignedRequests].forEach((request) => {
        requestMap.set(request.id, {
          id: request.id,
          buyer_id: request.buyer_id,
          assigned_seller_id: request.assigned_seller_id ?? null,
        });
      });

      return Array.from(requestMap.values());
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData ?? [],
  });

  const requestScopeKey = useMemo(
    () => requestScopes.map((request) => request.id).sort().join(','),
    [requestScopes],
  );

  useEffect(() => {
    requestIdsRef.current = requestScopes.map((request) => request.id);
  }, [requestScopes]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id, requestScopeKey],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user?.id || requestScopes.length === 0) return [];
      if (isSupabaseRelationKnownUnavailable('messages')) return [];

      const requestIds = requestScopes.map((request) => request.id);
      const requestMap = new Map(
        requestScopes.map((request) => [request.id, request]),
      );

      const messages = await executeSupabaseQuery<any[]>(
        () =>
          (supabase as any)
            .from('messages')
            .select('id, request_id, sender_id, content, created_at, is_read')
            .in('request_id', requestIds)
            .order('created_at', { ascending: false })
            .limit(100),
        {
          context: 'messages-hub-messages',
          fallbackData: [],
          relationName: 'messages',
          retries: 0,
        },
      );

      if (messages.length === 0) return [];

      const otherUserIds = new Set<string>();
      for (const message of messages) {
        const request = requestMap.get(message.request_id);
        if (!request) continue;

        const otherUserId =
          request.buyer_id === user.id
            ? request.assigned_seller_id
            : request.buyer_id;

        if (otherUserId) {
          otherUserIds.add(otherUserId);
        }
      }

      const profiles = otherUserIds.size
        ? await executeSupabaseQuery<any[]>(
            () =>
              supabase
                .from('profiles')
                .select('id, full_name, company_name, avatar_seed')
                .in('id', Array.from(otherUserIds)),
            {
              context: 'messages-hub-profiles',
              fallbackData: [],
              relationName: 'profiles',
            },
          )
        : [];

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile]),
      );

      const conversationMap = new Map<string, Conversation>();
      for (const message of messages) {
        const request = requestMap.get(message.request_id);
        if (!request) continue;

        const otherUserId =
          request.buyer_id === user.id
            ? request.assigned_seller_id
            : request.buyer_id;
        if (!otherUserId) continue;

        if (!conversationMap.has(message.request_id)) {
          const profile = profileMap.get(otherUserId);
          const otherUserName =
            profile?.company_name || profile?.full_name || 'User';
          const seed = profile?.avatar_seed || profile?.id || otherUserId;

          conversationMap.set(message.request_id, {
            id: message.request_id,
            request_id: message.request_id,
            last_message: message.content,
            last_message_at: message.created_at,
            unread_count: 0,
            other_user_name: otherUserName,
            other_user_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
          });
        }

        if (!message.is_read && message.sender_id !== user.id) {
          const conversation = conversationMap.get(message.request_id);
          if (conversation) {
            conversation.unread_count += 1;
          }
        }
      }

      return Array.from(conversationMap.values());
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData ?? [],
  });

  useEffect(() => {
    if (!user || isSupabaseRelationKnownUnavailable('messages')) return;

    const scheduleRefresh = () => {
      if (pendingRefetchTimeoutRef.current) {
        window.clearTimeout(pendingRefetchTimeoutRef.current);
      }

      pendingRefetchTimeoutRef.current = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['message-request-scopes', user.id] });
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        pendingRefetchTimeoutRef.current = null;
      }, 300);
    };

    const channel = supabase
      .channel(`messages-hub:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const requestId =
            (payload.new as any)?.request_id || (payload.old as any)?.request_id;
          if (!requestId || !requestIdsRef.current.includes(requestId)) {
            return;
          }
          scheduleRefresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
        },
        (payload) => {
          const nextBuyerId = (payload.new as any)?.buyer_id;
          const previousBuyerId = (payload.old as any)?.buyer_id;
          const nextAssignedSellerId = (payload.new as any)?.assigned_seller_id;
          const previousAssignedSellerId = (payload.old as any)?.assigned_seller_id;

          if (
            nextBuyerId !== user.id &&
            previousBuyerId !== user.id &&
            nextAssignedSellerId !== user.id &&
            previousAssignedSellerId !== user.id
          ) {
            return;
          }

          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (pendingRefetchTimeoutRef.current) {
        window.clearTimeout(pendingRefetchTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  const content = {
    en: {
      title: 'Messages',
      search: 'Search conversations...',
      noMessages: 'No messages yet',
      noMessagesDesc: 'When you start a conversation, it will appear here',
      unread: 'unread',
    },
    ar: {
      title: 'الرسائل',
      search: 'ابحث في الرسائل...',
      noMessages: 'لا توجد رسائل',
      noMessagesDesc: 'أول ما تبدأ محادثة بتظهر لك هنا',
      unread: 'غير مقروءة',
    },
  };

  const t = content[currentLanguage];

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return conversations ?? [];
    }

    return (conversations ?? []).filter(
      (conversation) =>
        conversation.other_user_name.toLowerCase().includes(normalizedSearch) ||
        conversation.last_message.toLowerCase().includes(normalizedSearch),
    );
  }, [conversations, searchQuery]);

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/app/messages/thread?request=${conversation.request_id}`);
  };

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} />
        <div className="px-6 py-6 space-y-3">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} />

      <div className="px-6 py-6 space-y-6">
        <div className="relative">
          <Search
            className={cn(
              'absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground',
              isArabic ? 'right-4' : 'left-4',
            )}
          />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={cn(
              'h-12 rounded-full border-border/30 bg-background',
              isArabic ? 'pr-12 text-right font-ar-body' : 'pl-12 text-left font-body',
            )}
          />
        </div>

        {filteredConversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center px-6 py-16"
          >
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
            <Heading3 lang={currentLanguage} className="mb-2">
              {t.noMessages}
            </Heading3>
            <Body lang={currentLanguage} className="text-center text-muted-foreground">
              {t.noMessagesDesc}
            </Body>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation, index) => (
              <motion.button
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleConversationClick(conversation)}
                className="w-full"
              >
                <SoftCard animate={false}>
                  <div className="flex items-center gap-4">
                    <AvatarBadge
                      src={conversation.other_user_avatar}
                      fallback={conversation.other_user_name.substring(0, 2).toUpperCase()}
                      size="md"
                      status="online"
                    />
                    <div className={cn('min-w-0 flex-1', isArabic ? 'text-right' : 'text-left')}>
                      <Body lang={currentLanguage} className="font-semibold">
                        {conversation.other_user_name}
                      </Body>
                      <BodySmall
                        lang={currentLanguage}
                        className="max-w-full truncate text-muted-foreground"
                      >
                        {conversation.last_message}
                      </BodySmall>
                      <Caption lang={currentLanguage} className="mt-1 text-muted-foreground">
                        {new Date(conversation.last_message_at).toLocaleTimeString(
                          isArabic ? 'ar-SA' : 'en-US',
                          {
                          hour: '2-digit',
                          minute: '2-digit',
                          },
                        )}
                      </Caption>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="flex min-w-[3rem] flex-col items-end gap-1">
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                          {conversation.unread_count}
                        </span>
                        <Caption lang={currentLanguage} className="text-muted-foreground">
                          {t.unread}
                        </Caption>
                      </div>
                    )}
                  </div>
                </SoftCard>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesHub;
