import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, MessageSquare, Paperclip, Image as ImageIcon, MapPin, X, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { trackMessageSent } from '@/lib/brevoAnalytics';
import { messageSchema } from '@/lib/validationSchemas';
import { handleError } from '@/lib/errorHandler';


// Allowed file types and max size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  sender_name?: string;
  payload?: MessagePayload;
}

interface MessagingPanelProps {
  quoteId?: string;
  bookingId?: string;
  quoteTitle?: string;
  userType?: 'buyer' | 'seller';
  onClose?: () => void;
}

export const MessagingPanel = ({ quoteId, bookingId, quoteTitle, userType, onClose }: MessagingPanelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((quoteId || bookingId) && user) {
      fetchMessages();
      
      const markMessagesAsRead = async () => {
        if (quoteId) {
          await sb
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('quote_id', quoteId)
            .eq('is_read', false)
            .neq('sender_id', user.id);
        } else if (bookingId) {
          await sb
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('booking_id', bookingId)
            .eq('is_read', false)
            .neq('sender_id', user.id);
        }
      };

      markMessagesAsRead();
      
      const channelId = quoteId ? `quote:${quoteId}` : `booking:${bookingId}`;
      const filter = quoteId ? `quote_id=eq.${quoteId}` : `booking_id=eq.${bookingId}`;
      
      const channel = sb
        .channel(`messages:${channelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter
          },
          () => {
            fetchMessages();
            markMessagesAsRead();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [quoteId, bookingId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      let query = supabase.from('messages').select('*');
      
      if (quoteId) {
        query = query.eq('quote_id', quoteId);
      } else if (bookingId) {
        query = query.eq('booking_id', bookingId);
      } else {
        setLoading(false);
        return;
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id)));
      let profilesMap: Record<string, any> = {};
      if (senderIds.length) {
        const { data: profiles } = await sb
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', senderIds);
        profilesMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }

      const messagesWithSenders = (data || []).map((m: any) => ({
        ...m,
        sender_name: profilesMap[m.sender_id]?.company_name || profilesMap[m.sender_id]?.full_name || 'Unknown'
      }));

      setMessages(messagesWithSenders);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content?: string, payload?: MessagePayload) => {
    const messageContent = content || newMessage.trim();
    if (!messageContent && !payload) return;
    if (!user) return;

    if (messageContent && !payload) {
      try {
        messageSchema.parse({ content: messageContent });
      } catch (error) {
        toast.error(handleError(error, 'Message Validation'));
        return;
      }
    }

    setSending(true);
    try {
      const messageData: any = {
        sender_id: user.id,
        content: messageContent || (payload?.type === 'image' ? '📷 Image' : payload?.type === 'file' ? '📎 File' : '📍 Location')
      };
      
      if (quoteId) messageData.quote_id = quoteId;
      else if (bookingId) messageData.booking_id = bookingId;
      
      if (payload) messageData.payload = payload;
      
      const { error } = await supabase.from('messages').insert(messageData);

      if (error) throw error;

      if (user?.email) {
        trackMessageSent(user.email, {
          conversationId: quoteId || bookingId || 'unknown',
          recipientType: userType === 'buyer' ? 'seller' : 'buyer'
        });
      }

      setNewMessage('');
      toast.success('Message sent!');
    } catch (error: any) {
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    if (!user) return;

    // Validate file type
    const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${type === 'image' ? 'JPG, PNG, GIF, WebP' : 'PDF, DOC, DOCX'}`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setUploading(true);
    try {
      // Sanitize filename
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
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

      await handleSendMessage(undefined, payload);
    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
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
        await handleSendMessage(undefined, payload);
        setUploading(false);
      },
      (error) => {
        toast.error('Unable to get your location: ' + error.message);
        setUploading(false);
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderAttachment = (payload: MessagePayload) => {
    if (payload.type === 'image') {
      return (
        <a href={payload.url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img 
            src={payload.url} 
            alt={payload.name || 'Image'} 
            className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90"
          />
        </a>
      );
    }

    if (payload.type === 'file') {
      return (
        <a 
          href={payload.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded-lg hover:bg-background/70"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm truncate max-w-[150px]">{payload.name}</span>
          <Download className="w-4 h-4 ml-auto" />
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
          className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded-lg hover:bg-background/70"
        >
          <MapPin className="w-5 h-5 text-red-500" />
          <span className="text-sm">View Location</span>
        </a>
      );
    }

    return null;
  };

  return (
    <Card className="border-rule">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          {quoteTitle ? `Messages - ${quoteTitle}` : 'Quote Messages'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {msg.sender_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-ink">
                          {isOwn ? 'You' : msg.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-ink'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.payload && renderAttachment(msg.payload)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

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

        <div className="flex gap-2">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              title="Send image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Send file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleShareLocation}
              disabled={uploading}
              title="Share location"
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Type your message... (Shift+Enter for new line)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            className="resize-none flex-1"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={sending || uploading || !newMessage.trim()}
            size="icon"
            className="h-auto"
          >
            {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
