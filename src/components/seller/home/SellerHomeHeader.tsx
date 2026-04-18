import { motion } from 'framer-motion';
import { getGreeting } from '@/lib/smartTime';
import { Bell, MessageCircle, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SellerHomeHeaderProps {
    currentLanguage: 'en' | 'ar';
}

export function SellerHomeHeader({ currentLanguage }: SellerHomeHeaderProps) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const greeting = getGreeting(currentLanguage);

    // Fetch user name
    const { data: profile } = useQuery({
        queryKey: ['seller-profile-basic', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase
                .from('profiles')
                .select('full_name, company_name, buyer_type')
                .eq('id', user.id)
                .single();
            return data;
        },
        enabled: !!user?.id,
        staleTime: 60_000, // 1 minute
    });

    // Fetch unread notification count
    const { data: notificationCount = 0 } = useQuery({
        queryKey: ['seller-notification-count', user?.id],
        queryFn: async () => {
            if (!user?.id) return 0;
            // This would query a notifications table in production
            // For now, return 0
            return 2; // Mock count for visual
        },
        enabled: !!user?.id,
        staleTime: 60000,
    });

    const displayName = profile?.company_name || profile?.full_name?.split(' ')[0] || 'Seller';
    const initials = displayName.charAt(0).toUpperCase();
    const anyProfile = profile as any;
    const isCompany = anyProfile?.buyer_type === 'company' || !!anyProfile?.company_name;

    return (
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-3">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center"
                >
                    <span className={cn(
                        "text-lg font-bold text-amber-800",
                        currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                    )}>
                        {initials}
                    </span>
                </motion.div>
                <div>
                    <p className={cn(
                        "text-xs text-muted-foreground",
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        {greeting}
                    </p>
                    <p className={cn(
                        "text-base font-semibold text-foreground",
                        currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                    )}>
                        {displayName}
                    </p>
                    {/* Account type badge */}
                    <span className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 w-fit',
                        isCompany
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                            : 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
                    )}>
                        {isCompany
                            ? <><Building2 className="w-3 h-3" />{currentLanguage === 'ar' ? 'شركة' : 'Company'}</>
                            : <><User className="w-3 h-3" />{currentLanguage === 'ar' ? 'فرد' : 'Individual'}</>
                        }
                    </span>
                </div>
            </div>

            {/* Right: Notifications + Messages */}
            <div className="flex items-center gap-2">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/app/seller/messages')}
                    className="relative p-2.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                >
                    <Bell size={20} className="text-foreground" />
                    {notificationCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/app/seller/messages')}
                    className="p-2.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                >
                    <MessageCircle size={20} className="text-foreground" />
                </motion.button>
            </div>
        </div>
    );
}
