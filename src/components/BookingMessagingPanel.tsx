import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, MessageSquare, Paperclip, Image as ImageIcon, MapPin, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';


const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
  is_read: boolean;
  payload?: MessagePayload;
}

interface BookingMessagingPanelProps {
  bookingId: string;
  bookingTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingMessagingPanel = ({ bookingId, bookingTitle, isOpen, onClose }: BookingMessagingPanelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bookingId && user && isOpen) {
      fetchMessages();
      const markMessagesAsRead = async () => {
        await supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('booking_id', bookingId).eq('is_read', false).neq('sender_id', user.id);
        setUnreadCount(0);
      };
      markMessagesAsRead();
      const channel = supabase.channel(`messages:booking:${bookingId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` }, () => { fetchMessages(); markMessagesAsRead(); }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [bookingId, user, isOpen]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { if (bookingId && user && !isOpen) fetchUnreadCount(); }, [bookingId, user, isOpen]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('booking_id', bookingId).eq('is_read', false).neq('sender_id', user?.id);
    setUnreadCount(count || 0);
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('messages').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true });
      if (error) throw error;
      const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id)));
      let profilesMap: Record<string, any> = {};
      if (senderIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, company_name').in('id', senderIds);
        profilesMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }
      setMessages((data || []).map((m: any) => ({ ...m, sender_name: profilesMap[m.sender_id]?.company_name || profilesMap[m.sender_id]?.full_name || 'Unknown' })));
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const handleSendMessage = async (content?: string, payload?: MessagePayload) => {
    const msg = content || newMessage.trim();
    if (!msg && !payload) return;
    if (!user) return;
    setSending(true);
    try {
      const data: any = { booking_id: bookingId, sender_id: user.id, content: msg || (payload?.type === 'image' ? '📷 Image' : payload?.type === 'file' ? '📎 File' : '📍 Location') };
      if (payload) data.payload = payload;
      const { error } = await supabase.from('messages').insert(data);
      if (error) throw error;
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error: any) { toast.error('Failed: ' + error.message); } finally { setSending(false); }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    if (!user) return;
    const allowed = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
    if (!allowed.includes(file.type)) { toast.error('Invalid file type'); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error('File too large (max 10MB)'); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('message-attachments').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(path);
      await handleSendMessage(undefined, { type, url: urlData.publicUrl, name: file.name, size: file.size, mimeType: file.type });
    } catch (error: any) { toast.error('Upload failed: ' + error.message); } finally { setUploading(false); }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setUploading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await handleSendMessage(undefined, { type: 'location', latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setUploading(false); },
      (err) => { toast.error(err.message); setUploading(false); }
    );
  };

  const renderAttachment = (p: MessagePayload) => {
    if (p.type === 'image' && p.url) return <a href={p.url} target="_blank" rel="noopener noreferrer" className="block mt-2"><img src={p.url} alt={p.name} className="max-w-[200px] rounded-lg" /></a>;
    if (p.type === 'file' && p.url) return <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded-lg"><FileText className="w-4 h-4" /><span className="text-xs truncate max-w-[150px]">{p.name}</span><Download className="w-3 h-3 ml-auto" /></a>;
    if (p.type === 'location' && p.latitude) return <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded-lg"><MapPin className="w-4 h-4 text-red-500" /><span className="text-xs">View Location</span></a>;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-accent" />{bookingTitle ? `Messages - ${bookingTitle}` : 'Booking Messages'}</DialogTitle></DialogHeader>
        <input type="file" ref={imageInputRef} className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} />
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'file')} />
        <div className="flex flex-col h-[500px]">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center"><MessageSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-50" /><p className="text-muted-foreground">No messages yet</p></div> : (
              <div className="space-y-4 py-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="w-8 h-8"><AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>{msg.sender_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                      <div className={`flex-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="flex items-baseline gap-2 mb-1"><span className="text-sm font-medium text-ink">{isOwn ? 'You' : msg.sender_name}</span><span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), 'MMM dd, HH:mm')}</span></div>
                        <div className={`rounded-lg px-4 py-2 max-w-[80%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-ink'}`}>
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
          <div className="flex gap-2 pt-4 border-t border-rule">
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={uploading}><ImageIcon className="w-4 h-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Paperclip className="w-4 h-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={handleShareLocation} disabled={uploading}><MapPin className="w-4 h-4" /></Button>
            </div>
            <Textarea placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} rows={2} className="resize-none flex-1" />
            <Button onClick={() => handleSendMessage()} disabled={sending || uploading || !newMessage.trim()} size="icon" className="h-auto">{sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useBookingUnreadCount = (bookingId: string) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!bookingId || !user) return;
    const fetchCount = async () => { const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('booking_id', bookingId).eq('is_read', false).neq('sender_id', user.id); setUnreadCount(count || 0); };
    fetchCount();
    const channel = supabase.channel(`unread:booking:${bookingId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` }, () => fetchCount()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, user]);
  return unreadCount;
};
