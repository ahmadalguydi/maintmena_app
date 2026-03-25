import { AlertCircle, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssueStatusBadgeProps {
    status: 'pending' | 'responded' | 'resolved' | 'needs_attention' | 'awaiting_agreement' | 'no_agreement' | 'escalated';
    currentLanguage: 'en' | 'ar';
    compact?: boolean;
}

const statusConfig = {
    pending: {
        en: 'Assistance Pending',
        ar: 'طلب مساعدة',
        color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: Clock,
    },
    responded: {
        en: 'Response Received',
        ar: 'تم الرد',
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        icon: MessageCircle,
    },
    awaiting_agreement: {
        en: 'Awaiting Agreement',
        ar: 'بانتظار الموافقة',
        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        icon: Clock,
    },
    resolved: {
        en: 'Resolved',
        ar: 'تم الحل',
        color: 'bg-green-500/10 text-green-600 border-green-500/20',
        icon: CheckCircle,
    },
    needs_attention: {
        en: 'Needs Attention',
        ar: 'يحتاج اهتمام',
        color: 'bg-red-500/10 text-red-600 border-red-500/20',
        icon: AlertCircle,
    },
    no_agreement: {
        en: 'No Agreement',
        ar: 'لم يتم الاتفاق',
        color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
        icon: AlertCircle,
    },
    escalated: {
        en: 'Escalated',
        ar: 'تم التصعيد',
        color: 'bg-red-500/10 text-red-600 border-red-500/20',
        icon: AlertCircle,
    },
};

export function IssueStatusBadge({ status, currentLanguage, compact = false }: IssueStatusBadgeProps) {
    const config = statusConfig[status];
    if (!config) return null;

    const Icon = config.icon;
    const label = currentLanguage === 'ar' ? config.ar : config.en;

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
                config.color,
                currentLanguage === 'ar' && 'font-ar-body'
            )}>
                <Icon className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{label}</span>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border",
            config.color,
            currentLanguage === 'ar' && 'font-ar-body'
        )}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
        </div>
    );
}
