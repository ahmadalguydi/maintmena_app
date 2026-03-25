/**
 * AppModal - Unified Modal Component
 * 
 * Provides consistent styling, RTL support, and bilingual content patterns
 * for all modal dialogs in the application.
 * 
 * Use this component when creating new modals to ensure consistency.
 * 
 * @example
 * ```tsx
 * <AppModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title={{ en: "Confirm Action", ar: "تأكيد الإجراء" }}
 *   description={{ en: "Are you sure?", ar: "هل أنت متأكد؟" }}
 *   currentLanguage={currentLanguage}
 * >
 *   <ModalContent />
 * </AppModal>
 * ```
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BilingualText {
    en: string;
    ar: string;
}

interface AppModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** Callback when open state changes */
    onOpenChange: (open: boolean) => void;
    /** Modal title (bilingual) */
    title: BilingualText;
    /** Modal description (bilingual, optional) */
    description?: BilingualText;
    /** Current language */
    currentLanguage: "en" | "ar";
    /** Modal content */
    children: React.ReactNode;
    /** Footer content (typically buttons) */
    footer?: React.ReactNode;
    /** Modal size variant */
    size?: "sm" | "md" | "lg" | "xl" | "full";
    /** Additional class names for dialog content */
    className?: string;
    /** Whether to show the close button */
    showCloseButton?: boolean;
}

const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[95vw]",
};

export function AppModal({
    open,
    onOpenChange,
    title,
    description,
    currentLanguage,
    children,
    footer,
    size = "md",
    className,
    showCloseButton = true,
}: AppModalProps) {
    const isRTL = currentLanguage === "ar";
    const t = (text: BilingualText) => text[currentLanguage];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    sizeClasses[size],
                    isRTL && "font-ar-body",
                    className
                )}
                dir={isRTL ? "rtl" : "ltr"}
            >
                <DialogHeader className={cn(isRTL && "text-right")}>
                    <DialogTitle className={cn(isRTL && "font-ar-heading")}>
                        {t(title)}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className={cn(isRTL && "font-ar-body")}>
                            {t(description)}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="py-4">{children}</div>

                {footer && <DialogFooter>{footer}</DialogFooter>}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Standard modal footer buttons
 */
interface ModalFooterProps {
    onCancel: () => void;
    onConfirm: () => void;
    currentLanguage: "en" | "ar";
    confirmLabel?: BilingualText;
    cancelLabel?: BilingualText;
    confirmDisabled?: boolean;
    confirmLoading?: boolean;
    confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function ModalFooter({
    onCancel,
    onConfirm,
    currentLanguage,
    confirmLabel = { en: "Confirm", ar: "تأكيد" },
    cancelLabel = { en: "Cancel", ar: "إلغاء" },
    confirmDisabled = false,
    confirmLoading = false,
    confirmVariant = "default",
}: ModalFooterProps) {
    const t = (text: BilingualText) => text[currentLanguage];

    return (
        <>
            <Button variant="outline" onClick={onCancel} disabled={confirmLoading}>
                {t(cancelLabel)}
            </Button>
            <Button
                variant={confirmVariant}
                onClick={onConfirm}
                disabled={confirmDisabled || confirmLoading}
            >
                {confirmLoading ? "..." : t(confirmLabel)}
            </Button>
        </>
    );
}

/**
 * Confirmation modal with pre-built UI
 */
interface ConfirmModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
    title: BilingualText;
    message: BilingualText;
    currentLanguage: "en" | "ar";
    confirmLabel?: BilingualText;
    cancelLabel?: BilingualText;
    variant?: "default" | "destructive";
}

export function ConfirmModal({
    open,
    onOpenChange,
    onConfirm,
    title,
    message,
    currentLanguage,
    confirmLabel = { en: "Confirm", ar: "تأكيد" },
    cancelLabel = { en: "Cancel", ar: "إلغاء" },
    variant = "default",
}: ConfirmModalProps) {
    const [loading, setLoading] = React.useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={message}
            currentLanguage={currentLanguage}
            footer={
                <ModalFooter
                    onCancel={() => onOpenChange(false)}
                    onConfirm={handleConfirm}
                    currentLanguage={currentLanguage}
                    confirmLabel={confirmLabel}
                    cancelLabel={cancelLabel}
                    confirmLoading={loading}
                    confirmVariant={variant === "destructive" ? "destructive" : "default"}
                />
            }
        >
            {/* Empty content - message is in description */}
            <></>
        </AppModal>
    );
}

// Need to import React for useState in ConfirmModal
import React from "react";
