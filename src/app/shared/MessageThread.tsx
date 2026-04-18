import { useState, useEffect, useRef, useMemo } from 'react';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Send, Check, CheckCheck, Paperclip, Image as ImageIcon, MapPin, FileText, Download, ArrowUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CashSafetyBanner } from '@/components/mobile/CashSafetyBanner';
import { WhatsAppEscapeWarning } from '@/components/mobile/WhatsAppEscapeWarning';
import { PriceProposalModal } from '@/components/mobile/PriceProposalModal';
import { PriceProposalBubble } from '@/components/mobile/PriceProposalBubble';
import { ReportButton } from '@/components/mobile/ReportButton';
import { isSupabaseRelationKnownUnavailable, rememberMissingSupabaseRelation } from '@/lib/supabaseSchema';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import type { SupabaseClient } from '@supabase/supabase-js';

// Untyped Supabase client for tables not present in the generated schema
const db = supabase as unknown as SupabaseClient;

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

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(currentRole === 'seller' ? '/app/seller/home' : '/app/buyer/home', { replace: true });
    }
  };

  const requestId = searchParams.get('request');
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcast = useRef(0);
  const isSeller = currentRole === 'seller';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { containerStyle: keyboardStyle, isKeyboardVisible } = useKeyboardAvoidance(0);

  // Thread ID for localStorage key
  const threadId = requestId || '';
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

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', requestId, messageLimit],
    queryFn: async () => {
      if (!requestId) return [];
      if (isSupabaseRelationKnownUnavailable('messages')) return [];

      const data = await executeSupabaseQuery<Message[]>(
        () => db
          .from('messages')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false })
          .limit(messageLimit) as any,
        {
          context: 'message-thread',
          fallbackData: [],
          relationName: 'messages',
        }
      );
      
      // Verify user is a participant before returning messages
      if (data && data.length > 0 && user?.id) {
        const isParticipant = data.some(m => m.sender_id === user.id || m.receiver_id === user.id);
        if (!isParticipant) return [];
      }

      // Sort ascending for proper chat order
      return [...(data || [])].map(msg => ({
        ...msg,
        payload: msg.payload ? (msg.payload as unknown as MessagePayload) : undefined
      })).sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ) as Message[];
    },
    enabled: !!requestId,
    staleTime: 10_000,
    refetchInterval: 15_000, // Fallback polling in case realtime subscription drops
    // SEAMLESS TRANSITION: Use the seeded placeholder data if available
    placeholderData: (previousData) => previousData,
  });

  // Determine the other party's ID from messages
  const otherPartyId = useMemo(() => {
    if (!messages || !user) return null;
    const otherMessage = messages.find(m => m.sender_id !== user.id);
    return otherMessage?.sender_id || null;
  }, [messages, user]);

  // Real-time subscription
  useEffect(() => {
    if (!requestId || isSupabaseRelationKnownUnavailable('messages')) return;

    const channel = supabase
      .channel(`messages-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          queryClient.setQueryData(['messages', requestId, messageLimit], (old: Message[] | undefined) => {
            if (!old) return [payload.new as Message];
            // Dedupe optimistic messages
            if (old.some(m => m.id === payload.new.id)) return old;
            return [...old, payload.new as Message];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          queryClient.setQueryData(['messages', requestId, messageLimit], (old: Message[] | undefined) => {
            if (!old) return [payload.new as Message];
            return old.map(m => m.id === payload.new.id ? { ...m, ...payload.new as Message } : m);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, requestId, messageLimit]);

  // ─── Typing indicator via Supabase broadcast ───
  useEffect(() => {
    if (!requestId || !user?.id) return;

    const typingChannel = supabase.channel(`typing-${requestId}`);

    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId !== user.id) {
          setIsOtherTyping(true);
          // Clear after 3s of no typing events
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [requestId, user?.id]);

  // Broadcast typing event (throttled to once per 2s)
  const broadcastTyping = () => {
    if (!requestId || !user?.id) return;
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;
    supabase.channel(`typing-${requestId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id },
    });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    // Scroll the container, not just the sentinel into view
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || !user || isSupabaseRelationKnownUnavailable('messages')) return;

    const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== user.id);
    if (unreadMessages.length === 0) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadMessages.map(m => m.id));

      if (!error) {
        // Optimistic cache update for read status
        queryClient.setQueryData(['messages', requestId, messageLimit], (old: Message[] | undefined) => {
           if (!old) return old;
           return old.map(m => unreadMessages.find(um => um.id === m.id) ? { ...m, is_read: true } : m);
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    markAsRead();
  }, [messages, user, queryClient, requestId, messageLimit]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, payload }: { content: string; payload?: MessagePayload }) => {
      if (!user?.id) {
        throw new Error(currentLanguage === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please sign in first');
      }
      if (isSupabaseRelationKnownUnavailable('messages')) {
        throw new Error(currentLanguage === 'ar' ? 'خدمة الرسائل غير متاحة حالياً' : 'Messaging is currently unavailable');
      }

      const messageData: Record<string, unknown> = {
        sender_id: user.id,
        content,
        request_id: requestId,
      };

      if (payload) messageData.payload = payload;

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData as any)
        .select('*')
        .single();

      if (error) {
        rememberMissingSupabaseRelation(error, 'messages');
        throw error;
      }
      return data;
    },
    onMutate: async (newMsg) => {
       if (!user?.id) return;
       await queryClient.cancelQueries({ queryKey: ['messages', requestId, messageLimit] });
       const previousMessages = queryClient.getQueryData<Message[]>(['messages', requestId, messageLimit]);
       const optimisticMsg: Message = {
         id: `temp-${Date.now()}`,
         sender_id: user.id,
         content: newMsg.content,
         created_at: new Date().toISOString(),
         is_read: false,
         payload: newMsg.payload,
       };
       queryClient.setQueryData(['messages', requestId, messageLimit], (old: Message[] = []) => [...old, optimisticMsg]);
       setMessageText(''); // immediate UI clear
       return { previousMessages, tempId: optimisticMsg.id };
    },
    onError: (error: unknown, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', requestId, messageLimit], context.previousMessages);
      }
      const errorMessage = error instanceof Error ? error.message : undefined;
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: errorMessage || (currentLanguage === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message'),
        variant: 'destructive'
      });
      setMessageText(variables.content);
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(['messages', requestId, messageLimit], (old: Message[] = []) => {
        return old.map(m => m.id === context?.tempId ? { ...data, payload: data.payload as unknown as MessagePayload } as Message : m);
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const handleSend = () => {
    if (!messageText.trim() || !user?.id) return;
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
    } catch (error: unknown) {
      toast({
        title: currentLanguage === 'ar' ? 'فشل الرفع' : 'Upload failed',
        description: error instanceof Error ? error.message : String(error),
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

  // ─── Role-specific quick replies ───
  const quickReplies = useMemo(() => {
    if (isSeller) {
      return currentLanguage === 'ar'
        ? ['أنا في الطريق', 'وصلت', 'أحتاج معلومات إضافية', 'سأرسل السعر', 'تم الإصلاح', 'شكراً لك']
        : ["I'm on my way", 'I have arrived', 'I need more details', "I'll send the price", 'Job is done', 'Thank you'];
    }
    return currentLanguage === 'ar'
      ? ['شكراً', 'موافق', 'متى ستصل؟', 'كم التكلفة؟', 'أرسل لي الموقع', 'تم، شكراً']
      : ['Thanks', 'Agreed', 'When will you arrive?', 'How much will it cost?', 'Send me your location', 'Done, thanks'];
  }, [isSeller, currentLanguage]);

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

  return (
    <div className="flex h-[100dvh] flex-col bg-background overflow-hidden" style={keyboardStyle} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={ct.title}
        showBack={true}
        onBack={handleBack}
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm shadow-sm flex-shrink-0"
        rightAction={
          otherPartyId ? (
            <ReportButton
              contentType="message"
              contentId={requestId || ''}
              reportedUserId={otherPartyId}
              currentLanguage={currentLanguage}
              variant="icon"
              className="opacity-70 hover:opacity-100"
            />
          ) : undefined
        }
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
      <motion.div
        ref={scrollContainerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 pb-2"
      >
        {messages && messages.length >= messageLimit && (
          <div className="flex justify-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMessageLimit(prev => prev + 50)}
              className="text-xs bg-muted/30"
            >
              {currentLanguage === 'ar' ? 'عرض الرسائل السابقة' : 'Load old messages'}
            </Button>
          </div>
        )}

        <div className="space-y-4">
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
              <div
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-forwards`}
              >
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-3xl ${isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                    : 'bg-muted text-foreground rounded-bl-md shadow-sm border border-border/40' // Added slight styling improvement for incoming
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
              </div>
            </div>
          );
        })}
        </div>
        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-muted rounded-3xl rounded-bl-md px-4 py-3 shadow-sm border border-border/40">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </motion.div>

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
      <div className={`border-t border-border/30 bg-background px-6 py-4 ${isKeyboardVisible ? 'pb-4' : 'pb-safe-or-4'}`}>
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
            onChange={(e) => { setMessageText(e.target.value); broadcastTyping(); }}
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
