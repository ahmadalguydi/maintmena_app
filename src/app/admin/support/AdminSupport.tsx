import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    MessageCircle,
    Clock,
    CheckCircle,
    User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminSupportProps {
    currentLanguage: 'en' | 'ar';
}

interface SupportChatUser {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface SupportChat {
    id: string;
    status: string;
    subject: string | null;
    created_at: string;
    user: SupportChatUser | null;
}

export const AdminSupport = ({ currentLanguage }: AdminSupportProps) => {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';
    const [activeFilter, setActiveFilter] = useState<'open' | 'closed' | 'all'>('open');

    const { data: chats, isLoading } = useQuery({
        queryKey: ['admin-support-chats', activeFilter],
        queryFn: async () => {
            try {
                let query = supabase
                    .from('support_chats')
                    .select(`
                        *,
                        user:profiles(full_name, email, avatar_url)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (activeFilter !== 'all') {
                    query = query.eq('status', activeFilter);
                }

                const { data, error } = await query;
                if (error) throw error;
                return (data || []) as SupportChat[];
            } catch (e) {
                if (import.meta.env.DEV) console.warn('support_chats table may not exist:', e);
                return [];
            }
        },
    });

    const content = {
        en: {
            title: 'Support Chats',
            open: 'Open',
            closed: 'Closed',
            all: 'All',
            noChats: 'No support chats',
            lastMessage: 'Last message',
        },
        ar: {
            title: 'محادثات الدعم',
            open: 'مفتوح',
            closed: 'مغلق',
            all: 'الكل',
            noChats: 'لا توجد محادثات',
            lastMessage: 'آخر رسالة',
        },
    };

    const t = content[currentLanguage];

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
            />

            <div className="px-4 py-4 space-y-4">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <Button
                        variant={activeFilter === 'open' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('open')}
                        className="rounded-full gap-1"
                    >
                        <Clock size={14} />
                        {t.open}
                    </Button>
                    <Button
                        variant={activeFilter === 'closed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('closed')}
                        className="rounded-full gap-1"
                    >
                        <CheckCircle size={14} />
                        {t.closed}
                    </Button>
                    <Button
                        variant={activeFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                        className="rounded-full"
                    >
                        {t.all}
                    </Button>
                </div>

                {/* Chats List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : chats && chats.length > 0 ? (
                    <div className="space-y-3">
                        {chats.map((chat) => (
                            <SoftCard
                                key={chat.id}
                                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/app/admin/support/${chat.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={chat.user?.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {(chat.user?.full_name || 'U').charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <BodySmall lang={currentLanguage} className="font-medium truncate">
                                                {chat.user?.full_name || chat.user?.email || 'Unknown User'}
                                            </BodySmall>
                                            <Badge className={cn(
                                                'text-xs',
                                                chat.status === 'open' ? 'bg-yellow-500' : 'bg-green-500'
                                            )}>
                                                {chat.status === 'open' ? t.open : t.closed}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Caption lang={currentLanguage} className="text-muted-foreground truncate max-w-[200px]">
                                                {chat.subject || 'No subject'}
                                            </Caption>
                                            <Caption lang={currentLanguage} className="text-muted-foreground flex-shrink-0">
                                                {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                                            </Caption>
                                        </div>
                                    </div>
                                </div>
                            </SoftCard>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noChats}</Body>
                    </div>
                )}
            </div>
        </div>
    );
};
