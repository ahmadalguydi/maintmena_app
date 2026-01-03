import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { useEffect, useState } from 'react';

interface MessagesHubProps {
  currentLanguage: 'en' | 'ar';
}

interface Conversation {
  id: string;
  quote_id: string | null;
  booking_id: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  other_user_name: string;
  other_user_avatar?: string;
}

const MessagesHub = ({ currentLanguage }: MessagesHubProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = currentLanguage === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Step 1: Get user's quotes (as seller) and quote requests (as buyer)
        const [quotesResult, requestsResult, bookingsAsBuyerResult, bookingsAsSellerResult] = await Promise.all([
          // Quotes where user is the seller
          supabase.from('quote_submissions').select('id, request_id, seller_id').eq('seller_id', user.id),
          // Requests where user is the buyer (to find their quote threads)
          supabase.from('maintenance_requests').select('id, buyer_id').eq('buyer_id', user.id),
          // Bookings where user is the buyer
          supabase.from('booking_requests').select('id, buyer_id, seller_id').eq('buyer_id', user.id),
          // Bookings where user is the seller
          supabase.from('booking_requests').select('id, buyer_id, seller_id').eq('seller_id', user.id)
        ]);

        const userQuoteIds = (quotesResult.data || []).map(q => q.id);
        const userRequestIds = (requestsResult.data || []).map(r => r.id);
        const userBookingIds = [
          ...(bookingsAsBuyerResult.data || []).map(b => b.id),
          ...(bookingsAsSellerResult.data || []).map(b => b.id)
        ];

        // Get quotes for buyer's requests
        let buyerQuotes: { id: string }[] = [];
        if (userRequestIds.length > 0) {
          const { data } = await supabase
            .from('quote_submissions')
            .select('id')
            .in('request_id', userRequestIds);
          buyerQuotes = data || [];
        }

        const allQuoteIds = [...new Set([...userQuoteIds, ...(buyerQuotes || []).map(q => q.id)])];
        const allBookingIds = [...new Set(userBookingIds)];

        if (allQuoteIds.length === 0 && allBookingIds.length === 0) {
          return [];
        }

        // Step 2: Get all messages for these quotes and bookings
        let messagesQuery = supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });

        // Build OR conditions for quote_id and booking_id
        const orConditions: string[] = [];
        if (allQuoteIds.length > 0) {
          orConditions.push(`quote_id.in.(${allQuoteIds.join(',')})`);
        }
        if (allBookingIds.length > 0) {
          orConditions.push(`booking_id.in.(${allBookingIds.join(',')})`);
        }

        if (orConditions.length > 0) {
          messagesQuery = messagesQuery.or(orConditions.join(','));
        }

        const { data: messages, error: messagesError } = await messagesQuery;

        if (messagesError) {
          console.error('Messages query error:', messagesError);
          return [];
        }
        if (!messages?.length) return [];

        // Step 3: Get all unique quote_ids and booking_ids from messages
        const messageQuoteIds = [...new Set(messages.filter(m => m.quote_id).map(m => m.quote_id))];
        const messageBookingIds = [...new Set(messages.filter(m => m.booking_id).map(m => m.booking_id))];

        // Step 4: Batch fetch quotes and bookings for context
        const [quotesData, bookingsData] = await Promise.all([
          messageQuoteIds.length > 0
            ? supabase.from('quote_submissions').select('id, seller_id, request_id').in('id', messageQuoteIds)
            : Promise.resolve({ data: [] }),
          messageBookingIds.length > 0
            ? supabase.from('booking_requests').select('id, buyer_id, seller_id').in('id', messageBookingIds)
            : Promise.resolve({ data: [] })
        ]);

        const quotesMap = new Map((quotesData.data || []).map(q => [q.id, q]));
        const bookingsMap = new Map((bookingsData.data || []).map(b => [b.id, b]));

        // Fetch request buyer_ids for quotes
        const quoteRequestIds = [...new Set((quotesData.data || []).map(q => q.request_id).filter(Boolean))];
        let requestsMap = new Map<string, any>();
        if (quoteRequestIds.length > 0) {
          const { data: reqData } = await supabase
            .from('maintenance_requests')
            .select('id, buyer_id')
            .in('id', quoteRequestIds);
          (reqData || []).forEach(r => requestsMap.set(r.id, r));
        }

        // Step 5: Determine other user for each conversation
        const otherUserIds = new Set<string>();
        const conversationOtherUsers = new Map<string, string>();

        for (const msg of messages) {
          const key = msg.quote_id || msg.booking_id;
          if (!key || conversationOtherUsers.has(key)) continue;

          let otherUserId: string | null = null;

          if (msg.quote_id) {
            const quote = quotesMap.get(msg.quote_id);
            if (quote) {
              const request = requestsMap.get(quote.request_id);
              if (quote.seller_id === user.id) {
                otherUserId = request?.buyer_id || null;
              } else {
                otherUserId = quote.seller_id;
              }
            }
          } else if (msg.booking_id) {
            const booking = bookingsMap.get(msg.booking_id);
            if (booking) {
              otherUserId = booking.buyer_id === user.id ? booking.seller_id : booking.buyer_id;
            }
          }

          if (otherUserId) {
            otherUserIds.add(otherUserId);
            conversationOtherUsers.set(key, otherUserId);
          }
        }

        // Step 6: Batch fetch profiles
        let profilesMap = new Map<string, any>();
        if (otherUserIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, company_name, avatar_seed')
            .in('id', Array.from(otherUserIds));

          profiles?.forEach(p => profilesMap.set(p.id, p));
        }

        // Step 7: Build conversations
        const conversationMap = new Map<string, any>();

        for (const message of messages) {
          const key = message.quote_id || message.booking_id;
          if (!key) continue;

          if (!conversationMap.has(key)) {
            const otherUserId = conversationOtherUsers.get(key);
            const profile = otherUserId ? profilesMap.get(otherUserId) : null;

            const otherUserName = profile?.company_name || profile?.full_name || 'User';
            const seed = profile?.avatar_seed || profile?.id || 'default';
            const otherUserAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

            conversationMap.set(key, {
              id: key,
              quote_id: message.quote_id,
              booking_id: message.booking_id,
              last_message: message.content,
              last_message_at: message.created_at,
              unread_count: 0,
              other_user_name: otherUserName,
              other_user_avatar: otherUserAvatar
            });
          }

          // Count unread
          if (!message.is_read && message.sender_id !== user.id) {
            conversationMap.get(key).unread_count++;
          }
        }

        return Array.from(conversationMap.values());
      } catch (err) {
        console.error('Messages hub error:', err);
        return [];
      }
    },
    enabled: !!user
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-hub-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const content = {
    en: {
      title: 'Messages',
      search: 'Search conversations...',
      noMessages: 'No messages yet',
      noMessagesDesc: 'When you start a conversation, it will appear here',
      unread: 'unread'
    },
    ar: {
      title: 'الرسائل',
      search: 'ابحث في المحادثات...',
      noMessages: 'لا توجد رسائل',
      noMessagesDesc: 'عندما تبدأ محادثة، ستظهر هنا',
      unread: 'غير مقروءة'
    }
  };

  const t = content[currentLanguage];

  // Filter conversations by search query
  const filteredConversations = conversations?.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (conv: Conversation) => {
    const params = conv.quote_id
      ? `?quote=${conv.quote_id}`
      : `?booking=${conv.booking_id}`;
    navigate(`/app/messages/thread${params}`);
  };

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} />
        <div className="px-6 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} />

      <div className="px-6 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-full pl-12 bg-background border-border/30"
          />
        </div>

        {/* Conversations */}
        {!filteredConversations || filteredConversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <Heading3 lang={currentLanguage} className="mb-2">
              {t.noMessages}
            </Heading3>
            <Body lang={currentLanguage} className="text-muted-foreground text-center">
              {t.noMessagesDesc}
            </Body>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conv, index) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleConversationClick(conv)}
                className="w-full"
              >
                <SoftCard animate={false}>
                  <div className="flex items-center gap-4">
                    <AvatarBadge
                      src={conv.other_user_avatar}
                      fallback={conv.other_user_name.substring(0, 2).toUpperCase()}
                      size="md"
                      status="online"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <Body lang={currentLanguage} className="font-semibold">
                        {conv.other_user_name}
                      </Body>
                      <BodySmall lang={currentLanguage} className="text-muted-foreground truncate max-w-full">
                        {conv.last_message}
                      </BodySmall>
                      <Caption lang={currentLanguage} className="text-muted-foreground mt-1">
                        {new Date(conv.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Caption>
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {conv.unread_count}
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
