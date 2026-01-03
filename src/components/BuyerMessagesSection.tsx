import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MessagingPanel } from './MessagingPanel';

interface BuyerMessagesSectionProps {
  userId: string;
  currentLanguage: 'en' | 'ar';
}

interface Conversation {
  id: string;
  quote_id?: string;
  booking_id?: string;
  seller_id: string;
  seller_name?: string;
  seller_company?: string;
  request_title?: string;
  service_category?: string;
  last_message_at?: string;
  unread_count: number;
  type: 'quote' | 'booking';
}

export function BuyerMessagesSection({ userId, currentLanguage }: BuyerMessagesSectionProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    setupRealtimeSubscription();
  }, [userId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('buyer-messages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchConversations = async () => {
    try {
      // Fetch all messages for user's quotes
      const { data: quoteMessages } = await sb
        .from('messages')
        .select(`
          *,
          quote_submissions!inner(
            id,
            seller_id,
            request_id,
            maintenance_requests!inner(
              id,
              title,
              buyer_id
            )
          )
        `)
        .eq('quote_submissions.maintenance_requests.buyer_id', userId)
        .not('quote_id', 'is', null);

      // Fetch all messages for user's bookings
      const { data: bookingMessages } = await sb
        .from('messages')
        .select(`
          *,
          booking_requests!inner(
            id,
            buyer_id,
            seller_id,
            service_category
          )
        `)
        .eq('booking_requests.buyer_id', userId)
        .not('booking_id', 'is', null);

      // Group quote messages by quote_id
      const quoteConversations = new Map<string, any>();
      (quoteMessages || []).forEach((msg: any) => {
        const quoteId = msg.quote_id;
        if (!quoteConversations.has(quoteId)) {
          quoteConversations.set(quoteId, {
            id: quoteId,
            quote_id: quoteId,
            seller_id: msg.quote_submissions.seller_id,
            request_title: msg.quote_submissions.maintenance_requests.title,
            last_message_at: msg.created_at,
            unread_count: 0,
            type: 'quote',
            messages: []
          });
        }
        const conv = quoteConversations.get(quoteId);
        conv.messages.push(msg);
        if (!msg.is_read && msg.sender_id !== userId) {
          conv.unread_count++;
        }
        if (new Date(msg.created_at) > new Date(conv.last_message_at)) {
          conv.last_message_at = msg.created_at;
        }
      });

      // Group booking messages by booking_id
      const bookingConversations = new Map<string, any>();
      (bookingMessages || []).forEach((msg: any) => {
        const bookingId = msg.booking_id;
        if (!bookingConversations.has(bookingId)) {
          bookingConversations.set(bookingId, {
            id: bookingId,
            booking_id: bookingId,
            seller_id: msg.booking_requests.seller_id,
            service_category: msg.booking_requests.service_category,
            last_message_at: msg.created_at,
            unread_count: 0,
            type: 'booking',
            messages: []
          });
        }
        const conv = bookingConversations.get(bookingId);
        conv.messages.push(msg);
        if (!msg.is_read && msg.sender_id !== userId) {
          conv.unread_count++;
        }
        if (new Date(msg.created_at) > new Date(conv.last_message_at)) {
          conv.last_message_at = msg.created_at;
        }
      });

      // Fetch seller profiles
      const allSellerIds = [
        ...Array.from(quoteConversations.values()).map((c) => c.seller_id),
        ...Array.from(bookingConversations.values()).map((c) => c.seller_id)
      ].filter(Boolean);

      const uniqueSellerIds = Array.from(new Set(allSellerIds));
      let sellerProfiles: Record<string, any> = {};
      
      if (uniqueSellerIds.length > 0) {
        const { data: profiles } = await sb
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', uniqueSellerIds);
        
        sellerProfiles = Object.fromEntries(
          (profiles || []).map((p: any) => [p.id, p])
        );
      }

      // Combine and format conversations
      const allConversations = [
        ...Array.from(quoteConversations.values()),
        ...Array.from(bookingConversations.values())
      ].map((conv) => ({
        ...conv,
        seller_name: sellerProfiles[conv.seller_id]?.full_name,
        seller_company: sellerProfiles[conv.seller_id]?.company_name
      })).sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setConversations(allConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const quoteConversations = conversations.filter(c => c.type === 'quote');
  const bookingConversations = conversations.filter(c => c.type === 'booking');

  const renderConversationList = (convList: Conversation[]) => {
    if (convList.length === 0) {
      return (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {currentLanguage === 'ar' ? 'لا توجد محادثات' : 'No conversations'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {convList.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setSelectedConversation(conv)}
            className={`w-full text-left p-4 border border-rule rounded-lg hover:bg-muted/50 transition-colors ${
              selectedConversation?.id === conv.id ? 'bg-muted/50 border-primary' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-ink truncate">
                  {conv.seller_company || conv.seller_name || 'Service Provider'}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {conv.type === 'quote' 
                    ? conv.request_title 
                    : `${currentLanguage === 'ar' ? 'حجز' : 'Booking'}: ${conv.service_category}`
                  }
                </p>
              </div>
              {conv.unread_count > 0 && (
                <Badge variant="default" className="ml-2">
                  {conv.unread_count}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {conv.last_message_at 
                  ? format(new Date(conv.last_message_at), 'MMM dd, HH:mm')
                  : 'No messages yet'
                }
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="border-rule">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            {currentLanguage === 'ar' ? 'الرسائل' : 'Messages'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {currentLanguage === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Conversations List */}
      <Card className="border-rule lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            {currentLanguage === 'ar' ? 'الرسائل' : 'Messages'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quotes">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="quotes">
                {currentLanguage === 'ar' ? 'العروض' : 'Quotes'} 
                {quoteConversations.length > 0 && ` (${quoteConversations.length})`}
              </TabsTrigger>
              <TabsTrigger value="bookings">
                {currentLanguage === 'ar' ? 'الحجوزات' : 'Bookings'} 
                {bookingConversations.length > 0 && ` (${bookingConversations.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quotes" className="max-h-[600px] overflow-y-auto">
              {renderConversationList(quoteConversations)}
            </TabsContent>

            <TabsContent value="bookings" className="max-h-[600px] overflow-y-auto">
              {renderConversationList(bookingConversations)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Message Panel */}
      <Card className="border-rule lg:col-span-2">
        <CardContent className="p-0">
          {selectedConversation ? (
            <MessagingPanel
              quoteId={selectedConversation.quote_id}
              bookingId={selectedConversation.booking_id}
              userType="buyer"
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  {currentLanguage === 'ar' 
                    ? 'حدد محادثة لعرض الرسائل' 
                    : 'Select a conversation to view messages'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
