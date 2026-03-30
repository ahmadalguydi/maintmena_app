import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    User,
    Search,
    Shield,
    ShoppingBag,
    Briefcase,
    Mail,
    Phone,
    Calendar,
    AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminUsersProps {
    currentLanguage: 'en' | 'ar';
}

interface AdminUser {
    id: string;
    full_name: string | null;
    email: string | null;
    company_name: string | null;
    avatar_url: string | null;
    user_type: string | null;
    phone: string | null;
    created_at: string;
    verified_seller: boolean | null;
}

export const AdminUsers = ({ currentLanguage }: AdminUsersProps) => {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'seller'>('all');

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users', searchQuery, roleFilter],
        queryFn: async () => {
            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (searchQuery) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
            }

            if (roleFilter !== 'all') {
                query = query.eq('user_type', roleFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as AdminUser[];
        },
    });

    const content = {
        en: {
            title: 'Users',
            search: 'Search users...',
            all: 'All',
            buyers: 'Buyers',
            sellers: 'Sellers',
            noUsers: 'No users found',
            joined: 'Joined',
            email: 'Email',
            phone: 'Phone',
            type: 'Type',
            verified: 'Verified',
            notVerified: 'Not Verified',
        },
        ar: {
            title: 'المستخدمين',
            search: 'بحث عن مستخدم...',
            all: 'الكل',
            buyers: 'المشترين',
            sellers: 'البائعين',
            noUsers: 'لا يوجد مستخدمين',
            joined: 'انضم',
            email: 'البريد',
            phone: 'الهاتف',
            type: 'النوع',
            verified: 'موثق',
            notVerified: 'غير موثق',
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
                {/* Search */}
                <div className="relative">
                    <Search className={cn(
                        'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground',
                        isArabic ? 'right-3' : 'left-3'
                    )} />
                    <Input
                        placeholder={t.search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn('rounded-full', isArabic ? 'pr-10 text-right' : 'pl-10')}
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <Button
                        variant={roleFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRoleFilter('all')}
                        className="rounded-full"
                    >
                        {t.all}
                    </Button>
                    <Button
                        variant={roleFilter === 'buyer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRoleFilter('buyer')}
                        className="rounded-full gap-1"
                    >
                        <ShoppingBag size={14} />
                        {t.buyers}
                    </Button>
                    <Button
                        variant={roleFilter === 'seller' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRoleFilter('seller')}
                        className="rounded-full gap-1"
                    >
                        <Briefcase size={14} />
                        {t.sellers}
                    </Button>
                </div>

                {/* Users List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : users && users.length > 0 ? (
                    <div className="space-y-3">
                        {users.map((user) => (
                            <SoftCard
                                key={user.id}
                                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BodySmall lang={currentLanguage} className="font-medium truncate">
                                                {user.company_name || user.full_name || user.email}
                                            </BodySmall>
                                            {user.verified_seller && (
                                                <Shield size={14} className="text-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {user.user_type === 'seller' ? (
                                                    <><Briefcase size={10} className="mr-1" /> Seller</>
                                                ) : (
                                                    <><ShoppingBag size={10} className="mr-1" /> Buyer</>
                                                )}
                                            </Badge>
                                            <Caption lang={currentLanguage} className="text-muted-foreground">
                                                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                                            </Caption>
                                        </div>
                                    </div>
                                </div>
                            </SoftCard>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noUsers}</Body>
                    </div>
                )}
            </div>

            {/* User Detail Sheet */}
            <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
                            {selectedUser?.company_name || selectedUser?.full_name}
                        </SheetTitle>
                    </SheetHeader>

                    {selectedUser && (
                        <div className="mt-6 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
                            {/* Avatar & Basic Info */}
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={selectedUser.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                                        {(selectedUser.full_name || 'U').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <BodySmall lang={currentLanguage} className="font-bold text-lg">
                                        {selectedUser.company_name || selectedUser.full_name}
                                    </BodySmall>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline">
                                            {selectedUser.user_type === 'seller' ? 'Seller' : 'Buyer'}
                                        </Badge>
                                        {selectedUser.verified_seller && (
                                            <Badge className="bg-blue-500 text-white">{t.verified}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2">
                                <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                    <Mail size={16} className="text-muted-foreground" />
                                    <Caption lang={currentLanguage}>{selectedUser.email}</Caption>
                                </div>
                                {selectedUser.phone && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                        <Phone size={16} className="text-muted-foreground" />
                                        <Caption lang={currentLanguage}>{selectedUser.phone}</Caption>
                                    </div>
                                )}
                                <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                    <Calendar size={16} className="text-muted-foreground" />
                                    <Caption lang={currentLanguage}>
                                        {t.joined} {formatDistanceToNow(new Date(selectedUser.created_at), { addSuffix: true })}
                                    </Caption>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    Close
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1 gap-2"
                                >
                                    <AlertTriangle size={16} />
                                    Suspend
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};
