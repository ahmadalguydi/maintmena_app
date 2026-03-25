import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, any>) => void;
  }
}

interface Message {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface LiveChatProps {
  currentLanguage: 'en' | 'ar';
}

const LiveChat = ({ currentLanguage }: LiveChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const content = {
    en: {
      title: 'Live Support',
      startChat: 'Start Chat',
      yourName: 'Your Name',
      yourEmail: 'Your Email',
      typeMessage: 'Type your message...',
      send: 'Send',
      connecting: 'Connecting...',
      connected: 'Connected - We\'ll respond shortly',
      close: 'Close'
    },
    ar: {
      title: 'الدعم المباشر',
      startChat: 'ابدأ المحادثة',
      yourName: 'اسمك',
      yourEmail: 'إيميلك',
      typeMessage: 'اكتب رسالتك...',
      send: 'إرسال',
      connecting: 'جاري الاتصال...',
      connected: 'متصل - سنرد عليك قريباً',
      close: 'إغلاق'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startChat = async () => {
    if (!userName || !userEmail) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'الرجاء إدخال الاسم والإيميل' : 'Please enter name and email',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: chat, error } = await supabase
        .from('support_chats')
        .insert({
          user_id: user?.id || null,
          user_email: userEmail,
          user_name: userName,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setChatId(chat.id);
      setHasStarted(true);

      // Send GA4 event
      if (window.gtag) {
        window.gtag('event', 'live_chat_started', {
          user_email: userEmail,
          user_name: userName
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل بدء المحادثة' : 'Failed to start chat',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatId) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user?.id || null,
          sender_type: 'user',
          message: inputMessage
        });

      if (error) throw error;

      setInputMessage('');

      // Send GA4 event
      if (window.gtag) {
        window.gtag('event', 'chat_message_sent', {
          chat_id: chatId
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-paper border border-rule rounded-lg shadow-2xl overflow-hidden"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="bg-accent text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-medium">{t.title}</h3>
                  {hasStarted && (
                    <p className="text-xs opacity-90">{t.connected}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-white/10 p-1 rounded transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/10 p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {!hasStarted ? (
                  /* Start Chat Form */
                  <div className="p-6 space-y-4">
                    <p className="text-muted-foreground text-sm">
                      {currentLanguage === 'ar' 
                        ? 'ابدأ محادثة مع فريق الدعم. سنرد عليك في أسرع وقت ممكن.'
                        : 'Start a conversation with our support team. We\'ll respond as soon as possible.'
                      }
                    </p>
                    <Input
                      placeholder={t.yourName}
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="bg-background"
                    />
                    <Input
                      type="email"
                      placeholder={t.yourEmail}
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="bg-background"
                    />
                    <Button
                      onClick={startChat}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? t.connecting : t.startChat}
                    </Button>
                  </div>
                ) : (
                  /* Chat Messages */
                  <>
                    <ScrollArea className="h-96 p-4" ref={scrollRef}>
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.sender_type === 'user'
                                  ? 'bg-accent text-white'
                                  : 'bg-muted text-ink'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString(
                                  currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t border-rule flex gap-2">
                      <Input
                        placeholder={t.typeMessage}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChat;
