import { motion } from 'framer-motion';
import { LucideIcon, Check, X, Pencil, Trash2, FileText, DollarSign, MessageCircle, Send, Eye, ArrowRight, PenLine, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Base Action Button Props
// ============================================
interface ActionButtonProps {
    label: string;
    labelAr: string;
    currentLanguage: 'en' | 'ar';
    onClick: (e: React.MouseEvent) => void;
    icon?: LucideIcon;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    flex?: boolean; // If true, uses flex-1
    size?: 'sm' | 'md' | 'lg'; // sm = default, md = h-10, lg = h-12
}

// Size classes
const sizeClasses = {
    sm: 'h-9 px-4 py-2 text-sm',
    md: 'h-10 px-5 py-2.5 text-sm',
    lg: 'h-12 px-6 py-3 text-base',
};

// ============================================
// Base Button Component (internal)
// ============================================
const BaseActionButton = ({
    label,
    labelAr,
    currentLanguage,
    onClick,
    icon: Icon,
    disabled = false,
    loading = false,
    className,
    flex = true,
    size = 'sm',
    iconClassName,
}: ActionButtonProps & { iconClassName?: string }) => (
    <motion.button
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={(e) => {
            e.stopPropagation();
            if (!disabled && !loading) onClick(e);
        }}
        disabled={disabled || loading}
        className={cn(
            "rounded-full text-center font-medium flex items-center justify-center gap-2 transition-all",
            sizeClasses[size],
            flex && "flex-1",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}
    >
        {loading ? (
            <div className={cn("border-2 border-current border-t-transparent rounded-full animate-spin", size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
        ) : Icon ? (
            <Icon className={cn("w-4 h-4", iconClassName)} />
        ) : null}
        {currentLanguage === 'ar' ? labelAr : label}
    </motion.button>
);

// ============================================
// PRIMARY BUTTONS (Filled, prominent actions)
// ============================================

/** Primary action button - Accept, Confirm, Submit */
export const PrimaryButton = (props: ActionButtonProps) => (
    <BaseActionButton
        {...props}
        className={cn("bg-primary text-white hover:bg-primary/90", props.className)}
        iconClassName="text-white"
    />
);

/** Accept button with check icon */
export const AcceptButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <PrimaryButton
        label="Accept"
        labelAr="قبول"
        icon={Check}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Sign Contract button with pen icon */
export const SignContractButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <PrimaryButton
        label="Sign Contract"
        labelAr="توقيع العقد"
        icon={PenTool}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Send Offer button with dollar icon */
export const SendOfferButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <PrimaryButton
        label="Send Offer"
        labelAr="إرسال عرض"
        icon={DollarSign}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Submit button with send icon */
export const SubmitButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <PrimaryButton
        label="Submit"
        labelAr="إرسال"
        icon={Send}
        currentLanguage={currentLanguage}
        {...props}
    />
);

// ============================================
// SECONDARY/GHOST BUTTONS (Outlined, less prominent)
// ============================================

/** Ghost/Secondary action button */
export const GhostButton = (props: ActionButtonProps) => (
    <BaseActionButton
        {...props}
        className={cn("bg-primary/10 text-primary hover:bg-primary/20", props.className)}
    />
);

/** Edit button with pencil icon - Ghost style */
export const EditButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <GhostButton
        label="Edit"
        labelAr="تعديل"
        icon={Pencil}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Edit Quote button with pencil icon - Primary style (for revision requested) */
export const EditQuoteButton = ({ currentLanguage, primary = false, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'> & { primary?: boolean }) => {
    const Button = primary ? PrimaryButton : GhostButton;
    return (
        <Button
            label="Edit Quote"
            labelAr="تعديل العرض"
            icon={Pencil}
            currentLanguage={currentLanguage}
            {...props}
        />
    );
};

/** View Contract button with file icon */
export const ViewContractButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <GhostButton
        label="View Contract"
        labelAr="عرض العقد"
        icon={FileText}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Message button with message icon */
export const MessageButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <GhostButton
        label="Message"
        labelAr="محادثة"
        icon={MessageCircle}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Request Edit button with pencil icon */
export const RequestEditButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <GhostButton
        label="Request Edit"
        labelAr="طلب تعديل"
        icon={Pencil}
        currentLanguage={currentLanguage}
        {...props}
    />
);

// ============================================
// DESTRUCTIVE BUTTONS (Red, dangerous actions)
// ============================================

/** Destructive action button - Delete, Reject, Cancel */
export const DestructiveButton = (props: ActionButtonProps) => (
    <BaseActionButton
        {...props}
        className={cn("text-red-500 bg-red-50 hover:bg-red-100", props.className)}
    />
);

/** Alternative destructive with bg - for prominent destructive actions */
export const DestructivePrimaryButton = (props: ActionButtonProps) => (
    <BaseActionButton
        {...props}
        className={cn("bg-destructive/10 text-destructive hover:bg-destructive/20", props.className)}
    />
);

/** Delete button with trash icon */
export const DeleteButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <DestructiveButton
        label="Delete"
        labelAr="حذف"
        icon={Trash2}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Reject button with X icon */
export const RejectButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <DestructivePrimaryButton
        label="Reject"
        labelAr="رفض"
        icon={X}
        currentLanguage={currentLanguage}
        {...props}
    />
);

/** Cancel button with X icon */
export const CancelButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <DestructiveButton
        label="Cancel"
        labelAr="إلغاء"
        icon={X}
        currentLanguage={currentLanguage}
        {...props}
    />
);

// ============================================
// NEUTRAL/MUTED BUTTONS (View Details, etc.)
// ============================================

/** Muted/Neutral action button */
export const MutedButton = (props: ActionButtonProps) => (
    <BaseActionButton
        {...props}
        className={cn("bg-muted hover:bg-muted/80 text-foreground", props.className)}
    />
);

/** View Details button with arrow */
export const ViewDetailsButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={(e) => {
            e.stopPropagation();
            props.onClick(e);
        }}
        className={cn(
            "flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2 text-center text-sm font-medium cursor-pointer",
            props.className
        )}
    >
        {currentLanguage === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
    </motion.div>
);

/** View button with eye icon */
export const ViewButton = ({ currentLanguage, ...props }: Omit<ActionButtonProps, 'label' | 'labelAr' | 'icon'>) => (
    <MutedButton
        label="View"
        labelAr="عرض"
        icon={Eye}
        currentLanguage={currentLanguage}
        {...props}
    />
);

// ============================================
// BUTTON GROUP CONTAINER
// ============================================

/** Container for action button groups */
export const ActionButtonGroup = ({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn("flex gap-2", className)}>
        {children}
    </div>
);

// ============================================
// FIXED BOTTOM BUTTON BAR
// ============================================

/** Fixed bottom button bar for detail screens */
export const FixedBottomBar = ({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]",
        className
    )}>
        <div className="max-w-md mx-auto">
            {children}
        </div>
    </div>
);

// ============================================
// EXPORTS - All button types
// ============================================
export {
    BaseActionButton,
    type ActionButtonProps,
};
