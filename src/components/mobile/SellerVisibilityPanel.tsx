import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SoftCard } from '@/components/mobile/SoftCard';
import { BodySmall, Caption } from '@/components/mobile/Typography';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SellerVisibilityPanelProps {
    currentLanguage: 'en' | 'ar';
}

export const SellerVisibilityPanel = ({ currentLanguage }: SellerVisibilityPanelProps) => {
    const isArabic = currentLanguage === 'ar';
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isVisible, setIsVisible] = useState(true);

    const content = {
        en: {
            title: 'Visibility',
            description: 'Control whether you are available for dispatch',
            visible: 'Visible to Buyers',
            hidden: 'Unavailable for Dispatch',
            visibleDesc: 'Buyers can find you and send requests',
            hiddenDesc: 'Take a break - you won\'t receive new jobs',
        },
        ar: {
            title: 'الظهور',
            description: 'تحكم في ظهورك في السوق',
            visible: 'ظاهر للمشترين',
            hidden: 'مخفي من السوق',
            visibleDesc: 'يمكن للمشترين إيجادك وإرسال طلبات',
            hiddenDesc: 'خذ استراحة - لن تستقبل طلبات جديدة',
        },
    };

    const t = content[currentLanguage];

    const toggleVisibilityMutation = useMutation({
        mutationFn: async (visible: boolean) => {
            if (!user?.id) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('profiles')
                .update({
                    discoverable: visible,
                    availability_status: visible ? 'available' : 'busy',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;
            return visible;
        },
        onSuccess: (visible) => {
            setIsVisible(visible);
            queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
            toast.success(
                visible
                    ? (isArabic ? 'أنت الآن ظاهر في السوق' : 'You are now available for dispatch')
                    : (isArabic ? 'أنت الآن مخفي من السوق' : 'You are now unavailable for dispatch')
            );
        },
        onError: () => {
            toast.error(isArabic ? 'حدث خطأ' : 'Error updating visibility');
        },
    });

    const handleToggle = () => {
        toggleVisibilityMutation.mutate(!isVisible);
    };

    return (
        <SoftCard className="p-4">
            <div className={cn("flex items-center justify-between", isArabic && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                    <div className={cn(
                        "p-2 rounded-xl",
                        isVisible ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                    )}>
                        {isVisible ? (
                            <Eye className="w-5 h-5 text-green-600" />
                        ) : (
                            <EyeOff className="w-5 h-5 text-muted-foreground" />
                        )}
                    </div>
                    <div className={isArabic ? "text-right" : "text-left"}>
                        <BodySmall lang={currentLanguage} className="font-semibold">
                            {isVisible ? t.visible : t.hidden}
                        </BodySmall>
                        <Caption lang={currentLanguage} className="text-muted-foreground">
                            {isVisible ? t.visibleDesc : t.hiddenDesc}
                        </Caption>
                    </div>
                </div>
                <Switch
                    checked={isVisible}
                    onCheckedChange={handleToggle}
                    disabled={toggleVisibilityMutation.isPending}
                />
            </div>
        </SoftCard>
    );
};
