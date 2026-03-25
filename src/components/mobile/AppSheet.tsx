/**
 * AppSheet - Unified Bottom Sheet Component
 * 
 * Provides consistent styling, RTL support, and bilingual content patterns
 * for all bottom sheets in the mobile application.
 * 
 * Use this for mobile-first interactions that slide up from the bottom.
 * For centered dialogs, use AppModal instead.
 * 
 * @example
 * ```tsx
 * <AppSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title={{ en: "Select Option", ar: "اختر خياراً" }}
 *   currentLanguage={currentLanguage}
 * >
 *   <SheetContent />
 * </AppSheet>
 * ```
 */

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BilingualText {
    en: string;
    ar: string;
}

interface AppSheetProps {
    /** Whether the sheet is open */
    open: boolean;
    /** Callback when open state changes */
    onOpenChange: (open: boolean) => void;
    /** Sheet title (bilingual, optional) */
    title?: BilingualText;
    /** Sheet description (bilingual, optional) */
    description?: BilingualText;
    /** Current language */
    currentLanguage: "en" | "ar";
    /** Sheet content */
    children: React.ReactNode;
    /** Footer content (typically buttons) */
    footer?: React.ReactNode;
    /** Additional class names for drawer content */
    className?: string;
    /** Whether to show the drag handle */
    showHandle?: boolean;
}

export function AppSheet({
    open,
    onOpenChange,
    title,
    description,
    currentLanguage,
    children,
    footer,
    className,
    showHandle = true,
}: AppSheetProps) {
    const isRTL = currentLanguage === "ar";
    const t = (text: BilingualText) => text[currentLanguage];

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent
                className={cn("focus:outline-none", className)}
                dir={isRTL ? "rtl" : "ltr"}
            >
                {showHandle && (
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4 mt-4" />
                )}

                <div className="px-6 pb-8 space-y-4">
                    {(title || description) && (
                        <DrawerHeader className={cn("p-0", isRTL && "text-right")}>
                            {title && (
                                <DrawerTitle className={cn(isRTL && "font-ar-heading")}>
                                    {t(title)}
                                </DrawerTitle>
                            )}
                            {description && (
                                <DrawerDescription className={cn(isRTL && "font-ar-body")}>
                                    {t(description)}
                                </DrawerDescription>
                            )}
                        </DrawerHeader>
                    )}

                    <div className={cn(isRTL && "font-ar-body")}>{children}</div>

                    {footer && (
                        <DrawerFooter className="p-0 pt-4">{footer}</DrawerFooter>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

/**
 * Standard sheet action button
 */
interface SheetActionProps {
    onClick: () => void;
    label: BilingualText;
    currentLanguage: "en" | "ar";
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
}

export function SheetAction({
    onClick,
    label,
    currentLanguage,
    variant = "default",
    disabled = false,
    loading = false,
    fullWidth = true,
}: SheetActionProps) {
    const t = (text: BilingualText) => text[currentLanguage];

    return (
        <Button
            variant={variant}
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
                "h-12 text-base rounded-xl",
                fullWidth && "w-full",
                variant === "default" && "bg-amber-600 hover:bg-amber-700 text-white"
            )}
        >
            {loading ? "..." : t(label)}
        </Button>
    );
}

/**
 * Action sheet with list of options
 */
interface ActionOption {
    id: string;
    label: BilingualText;
    icon?: React.ReactNode;
    destructive?: boolean;
}

interface ActionSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: BilingualText;
    options: ActionOption[];
    onSelect: (id: string) => void;
    currentLanguage: "en" | "ar";
}

export function ActionSheet({
    open,
    onOpenChange,
    title,
    options,
    onSelect,
    currentLanguage,
}: ActionSheetProps) {
    const isRTL = currentLanguage === "ar";
    const t = (text: BilingualText) => text[currentLanguage];

    const handleSelect = (id: string) => {
        onSelect(id);
        onOpenChange(false);
    };

    return (
        <AppSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            currentLanguage={currentLanguage}
        >
            <div className="space-y-2">
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-xl transition-colors",
                            "bg-muted/50 hover:bg-muted",
                            option.destructive && "text-destructive",
                            isRTL && "flex-row-reverse text-right"
                        )}
                    >
                        {option.icon && (
                            <span className="flex-shrink-0">{option.icon}</span>
                        )}
                        <span className={cn("font-medium", isRTL && "font-ar-body")}>
                            {t(option.label)}
                        </span>
                    </button>
                ))}
            </div>
        </AppSheet>
    );
}
