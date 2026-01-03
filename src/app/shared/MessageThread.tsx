import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Send, Check, CheckCheck, Paperclip, Image as ImageIcon, MapPin, FileText, Download, ArrowUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CashSafetyBanner } from '@/components/mobile/CashSafetyBanner';
import { WhatsAppEscapeWarning } from '@/components/mobile/WhatsAppEscapeWarning';
import { PriceProposalModal } from '@/components/mobile/PriceProposalModal';
import { PriceProposalBubble } from '@/components/mobile/PriceProposalBubble';

// Allowed file types and max size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface MessageThreadProps {
  currentLanguage: 'en' | 'ar';
}

interface MessagePayload {
  type: 'image' | 'file' | 'location';
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  payload?: MessagePayload;
}

export const MessageThread = ({ currentLanguage }: MessageThreadProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const quoteId = searchParams.get('quote');
  const bookingId = searchParams.get('booking');
  const requestId = searchParams.get('request');
  const [messageText, setMessageText] = useState('');
  const [resolvedQuoteId, setResolvedQuoteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isSeller = currentRole === 'seller';

  // Thread ID for localStorage key
  const threadId = quoteId || bookingId || requestId || '';
  const bannerStorageKey = `cashSafetyBanner_dismissed_${threadId}`;

  // Check if banner was previously dismissed for this thread
  useEffect(() => {
    if (threadId) {
      const wasDismissed = localStorage.getItem(bannerStorageKey) === 'true';
      setBannerDismissed(wasDismissed);
    }
  }, [threadId, bannerStorageKey]);

  const handleBannerDismiss = () => {
    setBannerDismissed(true);
    if (threadId) {
      localStorage.setItem(bannerStorageKey, 'true');
    }
  };

  // Resolve request to quote_id
  useEffect(() => {
    const resolveRequestToQuote = async () => {
      if (requestId && !quoteId) {
        const { data } = await supabase
          .from('quote_submissions')
          .select('id')
          .eq('request_id', requestId)
          .eq('status', 'accepted')
          .maybeSingle();

        if (data) {
          setResolvedQuoteId(data.id);
        }
      }
    };
    resolveRequestToQuote();
  }, [requestId, quoteId]);

  const activeQuoteId = quoteId || resolvedQuoteId;

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', activeQuoteId, bookingId],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (activeQuoteId) query = query.eq('quote_id', activeQuoteId);
      if (bookingId) query = query.eq('booking_id', bookingId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(msg => ({
        ...msg,
        payload: msg.payload ? (msg.payload as unknown as MessagePayload) : undefined
      })) as Message[];
    },
    enabled: !!activeQuoteId || !!bookingId
  });

  // Real-time subscription
  useEffect(() => {
    if (!activeQuoteId && !bookingId) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: activeQuoteId ? `quote_id=eq.${activeQuoteId}` : `booking_id=eq.${bookingId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', activeQuoteId, bookingId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: activeQuoteId ? `quote_id=eq.${activeQuoteId}` : `booking_id=eq.${bookingId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', activeQuoteId, bookingId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeQuoteId, bookingId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || !user) return;

    const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== user.id);
    if (unreadMessages.length === 0) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadMessages.map(m => m.id));

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['messages', activeQuoteId, bookingId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    markAsRead();
  }, [messages, user, queryClient, activeQuoteId, bookingId]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, payload }: { content: string; payload?: MessagePayload }) => {
      const messageData: any = {
        sender_id: user!.id,
        content,
        quote_id: activeQuoteId || null,
        booking_id: bookingId || null
      };

      if (payload) messageData.payload = payload;

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeQuoteId, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: error?.message || (currentLanguage === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message'),
        variant: 'destructive'
      });
    }
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText });
  };

  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    if (!user) return;

    const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: currentLanguage === 'ar' ? 'نوع ملف غير صالح' : 'Invalid file type',
        description: type === 'image'
          ? (currentLanguage === 'ar' ? 'مسموح: JPG, PNG, GIF, WebP' : 'Allowed: JPG, PNG, GIF, WebP')
          : (currentLanguage === 'ar' ? 'مسموح: PDF, DOC, DOCX' : 'Allowed: PDF, DOC, DOCX'),
        variant: 'destructive'
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: currentLanguage === 'ar' ? 'الملف كبير جداً' : 'File too large',
        description: currentLanguage === 'ar' ? 'الحد الأقصى 10 ميجابايت' : 'Maximum size is 10MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${Date.now()}_${sanitizedName}`;

      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      const payload: MessagePayload = {
        type,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type
      };

      const content = type === 'image' ? '📷 Image' : '📎 File';
      sendMessageMutation.mutate({ content, payload });
    } catch (error: any) {
      toast({
        title: currentLanguage === 'ar' ? 'فشل الرفع' : 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: currentLanguage === 'ar' ? 'غير مدعوم' : 'Not supported',
        description: currentLanguage === 'ar' ? 'تحديد الموقع غير مدعوم' : 'Geolocation is not supported',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload: MessagePayload = {
          type: 'location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        sendMessageMutation.mutate({ content: '📍 Location', payload });
        setUploading(false);
      },
      (error) => {
        toast({
          title: currentLanguage === 'ar' ? 'خطأ في الموقع' : 'Location error',
          description: error.message,
          variant: 'destructive'
        });
        setUploading(false);
      }
    );
  };

  const renderAttachment = (payload: MessagePayload, isOwn: boolean) => {
    if (payload.type === 'image' && payload.url) {
      return (
        <a href={payload.url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img
            src={payload.url}
            alt={payload.name || 'Image'}
            className="max-w-[180px] rounded-lg cursor-pointer hover:opacity-90"
          />
        </a>
      );
    }

    if (payload.type === 'file' && payload.url) {
      return (
        <a
          href={payload.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'}`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-xs truncate max-w-[120px]">{payload.name}</span>
          <Download className="w-3 h-3 ml-auto" />
        </a>
      );
    }

    if (payload.type === 'location' && payload.latitude && payload.longitude) {
      const mapUrl = `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}`;
      return (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'}`}
        >
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-xs">{currentLanguage === 'ar' ? 'عرض الموقع' : 'View Location'}</span>
        </a>
      );
    }

    return null;
  };

  const quickReplies = currentLanguage === 'ar'
    ? ['شكراً', 'موافق', 'سأراجع', 'متى يمكنك البدء؟']
    : ['Thanks', 'Agreed', 'Will review', 'When can you start?'];

  const content_text = {
    en: {
      title: 'Chat',
      typePlaceholder: 'Type a message...',
      today: 'Today',
      yesterday: 'Yesterday'
    },
    ar: {
      title: 'المحادثة',
      typePlaceholder: 'اكتب رسالة...',
      today: 'اليوم',
      yesterday: 'أمس'
    }
  };

  const ct = content_text[currentLanguage];

  if (isLoading) {
    return (
      <div className="pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={ct.title} onBack={() => navigate(-1)} />
        <div className="px-6 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="w-3/4 h-16 bg-muted/50 rounded-3xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background pb-safe" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={ct.title}
        showBack={true}
        onBack={() => navigate(-1)}
      />

      {/* Cash Safety Banner - only for buyers and not dismissed for this thread */}
      {!isSeller && !bannerDismissed && <CashSafetyBanner currentLanguage={currentLanguage} onDismiss={handleBannerDismiss} />}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'file')}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages?.map((message, index) => {
          const isOwn = message.sender_id === user?.id;
          const showTimestamp = index === 0 ||
            new Date(message.created_at).getDate() !== new Date(messages[index - 1].created_at).getDate();

          return (
            <div key={message.id}>
              {showTimestamp && (
                <div className="text-center text-xs text-muted-foreground my-4">
                  {new Date(message.created_at).toLocaleDateString()}
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-3xl ${isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  {message.payload && renderAttachment(message.payload, isOwn)}
                  <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className={isOwn ? 'opacity-70' : 'text-muted-foreground'}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && (
                      message.is_read ? (
                        <CheckCheck size={14} className="opacity-70" />
                      ) : (
                        <Check size={14} className="opacity-70" />
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-6 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              onClick={() => {
                setMessageText(reply);
                sendMessageMutation.mutate({ content: reply });
              }}
              className="px-4 py-2 rounded-full bg-muted text-sm font-medium whitespace-nowrap hover:bg-muted/80 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 pb-6 bg-background border-t border-border/30">
        <div className="flex gap-2 items-center">
          {/* Attachment buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={handleShareLocation}
              disabled={uploading}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <MapPin size={18} />
            </button>
          </div>

          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={ct.typePlaceholder}
            className="flex-1 h-12 rounded-full"
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessageMutation.isPending || uploading}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
