import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, MessageCircle, CheckCircle, Clock, ChevronDown, ChevronUp, FileWarning, Wrench, DollarSign, XCircle, Phone, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobIssue, OUTCOME_LABELS, IssueType } from '@/hooks/useJobIssues';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useState } from 'react';

interface ActiveIssueCardProps {
    issue: JobIssue;
    currentLanguage: 'en' | 'ar';
    userRole: 'buyer' | 'seller';
    userId?: string;
    onRespond?: () => void;
    onAcceptResolution?: () => void;
    onRejectResolution?: () => void;
    onViewDetails?: () => void;
}

// Issue type labels with icons
const issueTypeConfig: Record<IssueType, { en: string; ar: string; icon: any }> = {
    no_response: { en: 'No Response', ar: 'لا يوجد رد', icon: Phone },
    no_show: { en: 'Did Not Show Up', ar: 'لم يحضر', icon: XCircle },
    quality: { en: 'Quality Issue', ar: 'مشكلة جودة', icon: Wrench },
    price_change: { en: 'Price Change', ar: 'تغيير السعر', icon: DollarSign },
    exit: { en: 'Cancel Request', ar: 'طلب إلغاء', icon: FileWarning },
};

const statusConfig = {
    pending: {
        en: { title: 'Assistance Requested', desc: 'Waiting for service provider response' },
        ar: { title: 'طلب مساعدة مُقدَّم', desc: 'في انتظار رد مقدم الخدمة' },
        bgClass: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200',
        textClass: 'text-orange-700 dark:text-orange-300',
        icon: Clock,
        step: 1,
    },
    responded: {
        en: { title: 'Response Received', desc: 'Please review the response and take action' },
        ar: { title: 'تم الرد', desc: 'يرجى مراجعة الرد واتخاذ إجراء' },
        bgClass: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200',
        textClass: 'text-blue-700 dark:text-blue-300',
        icon: MessageCircle,
        step: 2,
    },
    awaiting_agreement: {
        en: { title: 'Awaiting Agreement', desc: 'Both parties need to confirm the resolution' },
        ar: { title: 'بانتظار الموافقة', desc: 'يجب على الطرفين تأكيد الحل' },
        bgClass: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200',
        textClass: 'text-yellow-700 dark:text-yellow-300',
        icon: Clock,
        step: 3,
    },
    resolved: {
        en: { title: 'Resolved', desc: 'This issue has been successfully resolved' },
        ar: { title: 'تم الحل', desc: 'تم حل هذه المشكلة بنجاح' },
        bgClass: 'bg-green-50 dark:bg-green-950/20 border-green-200',
        textClass: 'text-green-700 dark:text-green-300',
        icon: CheckCircle,
        step: 4,
    },
    needs_attention: {
        en: { title: 'Needs Attention', desc: 'This issue requires immediate action' },
        ar: { title: 'يحتاج اهتمام', desc: 'هذه المشكلة تتطلب إجراء فوري' },
        bgClass: 'bg-red-50 dark:bg-red-950/20 border-red-200',
        textClass: 'text-red-700 dark:text-red-300',
        icon: AlertCircle,
        step: 2,
    },
    no_agreement: {
        en: { title: 'No Agreement Reached', desc: 'Escalated to support team for review' },
        ar: { title: 'لم يتم الاتفاق', desc: 'تم التصعيد لفريق الدعم للمراجعة' },
        bgClass: 'bg-gray-50 dark:bg-gray-950/20 border-gray-300',
        textClass: 'text-gray-700 dark:text-gray-300',
        icon: AlertCircle,
        step: 3,
    },
    escalated: {
        en: { title: 'Escalated to Support', desc: 'Our support team is reviewing this case' },
        ar: { title: 'تم التصعيد للدعم', desc: 'فريق الدعم يراجع هذه القضية' },
        bgClass: 'bg-red-50 dark:bg-red-950/20 border-red-200',
        textClass: 'text-red-700 dark:text-red-300',
        icon: AlertCircle,
        step: 4,
    },
};

// Progress steps
const progressSteps = {
    en: ['Submitted', 'Responded', 'Agreement', 'Resolved'],
    ar: ['مُقدَّم', 'تم الرد', 'الموافقة', 'تم الحل'],
};

export function ActiveIssueCard({
    issue,
    currentLanguage,
    userRole,
    userId,
    onRespond,
    onAcceptResolution,
    onRejectResolution,
    onViewDetails,
}: ActiveIssueCardProps) {
    const [expanded, setExpanded] = useState(true);
    const currencyLabel = currentLanguage === 'ar' ? 'ر.س' : 'SAR';
    const config = statusConfig[issue.status] || statusConfig.pending;
    const Icon = config.icon;
    const isRaiser = issue.raised_by === userId;
    // Seller can respond when status is pending OR needs_attention (timed out but still openable)
    const canRespond = !isRaiser && ['pending', 'needs_attention'].includes(issue.status) && onRespond;
    // Buyer can accept/reject when seller has responded
    const canResolve = isRaiser && issue.status === 'responded' && (onAcceptResolution || onRejectResolution);

    // Get issue type config
    const issueType = issueTypeConfig[issue.issue_type];
    const IssueIcon = issueType?.icon || FileWarning;

    // Get outcome label
    const outcomeLabel = OUTCOME_LABELS[issue.outcome_selected];
    const outcomeText = currentLanguage === 'ar' ? outcomeLabel?.ar : outcomeLabel?.en;

    // Time info
    const timeAgo = formatDistanceToNow(new Date(issue.created_at), {
        addSuffix: true,
        locale: currentLanguage === 'ar' ? ar : enUS,
    });

    const raisedDate = format(new Date(issue.created_at), 'MMM d, yyyy • h:mm a', {
        locale: currentLanguage === 'ar' ? ar : enUS,
    });

    // Calculate current step (1-4)
    const currentStep = config.step || 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden"
        >
            <div className={cn(
                'rounded-2xl border overflow-hidden',
                config.bgClass
            )}>
                {/* Header - Always visible - Use div instead of button to avoid nesting */}
                <div
                    onClick={() => setExpanded(!expanded)}
                    className="w-full p-4 flex items-center justify-between cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
                >
                    <div className={cn("flex items-center gap-3", currentLanguage === 'ar' && 'flex-row-reverse')}>
                        <div className={cn('p-2.5 rounded-xl', config.bgClass, 'bg-white/50 dark:bg-black/20')}>
                            <Icon className={cn('w-5 h-5', config.textClass)} />
                        </div>
                        <div className={currentLanguage === 'ar' ? 'text-right' : 'text-left'}>
                            <h4 className={cn(
                                'font-semibold text-base',
                                config.textClass,
                                currentLanguage === 'ar' && 'font-ar-heading'
                            )}>
                                {currentLanguage === 'ar' ? config.ar.title : config.en.title}
                            </h4>
                            <p className={cn(
                                'text-xs opacity-75',
                                config.textClass,
                                currentLanguage === 'ar' && 'font-ar-body'
                            )}>
                                {timeAgo}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {expanded ? (
                            <ChevronUp className={cn('w-5 h-5', config.textClass)} />
                        ) : (
                            <ChevronDown className={cn('w-5 h-5', config.textClass)} />
                        )}
                    </div>
                </div>

                {/* Expandable content */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 space-y-4">
                                {/* Respond Button - Prominent placement at top of expanded content */}
                                {canRespond && (
                                    <Button
                                        onClick={() => onRespond?.()}
                                        className={cn(
                                            "w-full h-12 gap-2 rounded-xl text-base font-semibold",
                                            "bg-primary hover:bg-primary/90 text-white shadow-md"
                                        )}
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        {currentLanguage === 'ar' ? 'الرد على الطلب' : 'Respond to Request'}
                                    </Button>
                                )}

                                {/* Progress Tracker */}
                                <div className="bg-white/60 dark:bg-black/30 rounded-xl p-3">
                                    <p className={cn(
                                        'text-xs font-medium mb-3 text-muted-foreground',
                                        currentLanguage === 'ar' && 'font-ar-body text-right'
                                    )}>
                                        {currentLanguage === 'ar' ? 'تقدم الطلب' : 'Request Progress'}
                                    </p>
                                    <div className="flex items-center justify-between relative">
                                        {/* Progress line background */}
                                        <div className="absolute top-3 left-4 right-4 h-0.5 bg-muted" />
                                        {/* Progress line fill - RTL aware */}
                                        <div
                                            className={cn(
                                                "absolute top-3 h-0.5 bg-primary transition-all duration-300",
                                                currentLanguage === 'ar' ? "right-4" : "left-4"
                                            )}
                                            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                                        />

                                        {progressSteps[currentLanguage].map((step, index) => (
                                            <div key={index} className="flex flex-col items-center z-10">
                                                <div className={cn(
                                                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                                    index + 1 <= currentStep
                                                        ? 'bg-primary text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                )}>
                                                    {index + 1 < currentStep ? (
                                                        <CheckCircle className="w-4 h-4" />
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    'text-[10px] mt-1 text-center max-w-[50px]',
                                                    currentLanguage === 'ar' && 'font-ar-body',
                                                    index + 1 <= currentStep
                                                        ? 'text-foreground font-medium'
                                                        : 'text-muted-foreground'
                                                )}>
                                                    {step}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Issue Type Badge */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className={cn(
                                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                                        'bg-white/60 dark:bg-black/30 text-foreground'
                                    )}>
                                        <IssueIcon className="w-3.5 h-3.5" />
                                        <span className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
                                            {currentLanguage === 'ar' ? issueType?.ar : issueType?.en}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        'text-xs text-muted-foreground',
                                        currentLanguage === 'ar' && 'font-ar-body'
                                    )}>
                                        {raisedDate}
                                    </span>
                                </div>

                                {/* What was reported */}
                                <div className="bg-white/60 dark:bg-black/30 rounded-xl p-3 space-y-2">
                                    <p className={cn(
                                        'text-xs font-medium text-muted-foreground',
                                        currentLanguage === 'ar' && 'font-ar-body'
                                    )}>
                                        {currentLanguage === 'ar' ? 'ما تم الإبلاغ عنه:' : 'What was reported:'}
                                    </p>
                                    <p className={cn(
                                        'text-sm font-semibold text-foreground',
                                        currentLanguage === 'ar' && 'font-ar-body'
                                    )}>
                                        {outcomeText}
                                    </p>
                                    {issue.raised_chip && (
                                        <span className="inline-block px-2.5 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                                            {issue.raised_chip}
                                        </span>
                                    )}
                                    {issue.raised_note && (
                                        <p className={cn(
                                            'text-sm text-muted-foreground italic',
                                            currentLanguage === 'ar' && 'font-ar-body'
                                        )}>
                                            "{issue.raised_note}"
                                        </p>
                                    )}
                                </div>

                                {/* Response section (if responded) */}
                                {issue.response_note && issue.status !== 'pending' && (
                                    <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-3 border-l-3 border-blue-400">
                                        <p className={cn(
                                            'text-xs font-medium text-blue-600 mb-1',
                                            currentLanguage === 'ar' && 'font-ar-body'
                                        )}>
                                            {currentLanguage === 'ar'
                                                ? (userRole === 'buyer' ? 'رد مقدم الخدمة:' : 'ردك:')
                                                : (userRole === 'buyer' ? 'Service Provider Response:' : 'Your Response:')}
                                        </p>
                                        <p className={cn(
                                            'text-sm text-foreground',
                                            currentLanguage === 'ar' && 'font-ar-body'
                                        )}>
                                            {issue.response_note}
                                        </p>
                                        {issue.responded_at && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {format(new Date(issue.responded_at), 'MMM d • h:mm a', {
                                                    locale: currentLanguage === 'ar' ? ar : enUS,
                                                })}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Buyer Resolution Buttons (when seller responded) */}
                                {canResolve && (
                                    <div className="bg-green-50/50 dark:bg-green-950/20 rounded-xl p-4 space-y-3">
                                        <p className={cn(
                                            'text-sm font-medium text-center',
                                            currentLanguage === 'ar' && 'font-ar-body'
                                        )}>
                                            {currentLanguage === 'ar'
                                                ? 'هل الرد يحل مشكلتك؟'
                                                : 'Does this response resolve your issue?'}
                                        </p>
                                        <div className="flex gap-3">
                                            {onAcceptResolution && (
                                                <Button
                                                    onClick={onAcceptResolution}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                    {currentLanguage === 'ar' ? 'نعم، تم الحل' : 'Yes, Resolved'}
                                                </Button>
                                            )}
                                            {onRejectResolution && (
                                                <Button
                                                    onClick={onRejectResolution}
                                                    variant="outline"
                                                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                    {currentLanguage === 'ar' ? 'لاٌ أحتاج المزيد' : 'No, Need More'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Price change info */}
                                {issue.issue_type === 'price_change' && (
                                    <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3 space-y-2">
                                        {issue.original_quote_amount && (
                                            <div className="flex justify-between items-center">
                                                <span className={cn(
                                                    'text-xs text-muted-foreground',
                                                    currentLanguage === 'ar' && 'font-ar-body'
                                                )}>
                                                    {currentLanguage === 'ar' ? 'السعر الأصلي:' : 'Original Price:'}
                                                </span>
                                                <span className="font-medium text-muted-foreground line-through">
                                                    {issue.original_quote_amount.toLocaleString()} {currencyLabel}
                                                </span>
                                            </div>
                                        )}
                                        {issue.proposed_new_amount && (
                                            <div className="flex justify-between items-center">
                                                <span className={cn(
                                                    'text-xs text-amber-700',
                                                    currentLanguage === 'ar' && 'font-ar-body'
                                                )}>
                                                    {currentLanguage === 'ar' ? 'السعر الجديد المقترح:' : 'Proposed New Price:'}
                                                </span>
                                                <span className="font-bold text-amber-700">
                                                    {issue.proposed_new_amount.toLocaleString()} {currencyLabel}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Deadline warning */}
                                {issue.status === 'pending' && issue.response_deadline && (
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-100/50 dark:bg-orange-900/20">
                                        <Clock className="w-4 h-4 text-orange-600" />
                                        <span className={cn(
                                            'text-xs text-orange-700',
                                            currentLanguage === 'ar' && 'font-ar-body'
                                        )}>
                                            {currentLanguage === 'ar' ? 'يجب الرد قبل:' : 'Response deadline:'}{' '}
                                            {format(new Date(issue.response_deadline), 'MMM d, h:mm a', {
                                                locale: currentLanguage === 'ar' ? ar : enUS,
                                            })}
                                        </span>
                                    </div>
                                )}

                                {/* Status description */}
                                <p className={cn(
                                    'text-xs text-center py-2 px-3 rounded-lg bg-white/40 dark:bg-black/20',
                                    config.textClass,
                                    currentLanguage === 'ar' && 'font-ar-body'
                                )}>
                                    {currentLanguage === 'ar' ? config.ar.desc : config.en.desc}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

