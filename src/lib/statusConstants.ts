/**
 * Centralized contract status definitions
 * Use these constants across the application for consistency
 */

// Contract status values (as stored in database)
export const CONTRACT_STATUS = {
    /** Contract is being prepared, not yet shared */
    DRAFT: 'draft',
    /** Waiting for buyer to sign */
    PENDING_BUYER: 'pending_buyer',
    /** Waiting for seller to sign */
    PENDING_SELLER: 'pending_seller',
    /** Both parties have signed, contract is active */
    EXECUTED: 'executed',
    /** Contract was cancelled before completion */
    CANCELLED: 'cancelled',
} as const;

export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];

// Quote status values
export const QUOTE_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    NEGOTIATING: 'negotiating',
    REVISION_REQUESTED: 'revision_requested',
} as const;

export type QuoteStatus = typeof QUOTE_STATUS[keyof typeof QUOTE_STATUS];

// Booking status values
export const BOOKING_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

// Maintenance request status values
export const REQUEST_STATUS = {
    OPEN: 'open',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CLOSED: 'closed',
    CANCELLED: 'cancelled',
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

/**
 * Get UI-friendly status display configuration
 * @param status - The contract status from database
 * @param lang - Language for label
 * @param isJobComplete - Optional: Whether the job is fully complete (buyer AND seller marked complete)
 */
export function getContractStatusConfig(
    status: string,
    lang: 'en' | 'ar' = 'en',
    isJobComplete?: boolean
): { variant: 'success' | 'warning' | 'error' | 'info' | 'pending'; label: string } {
    const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'pending'; labelEn: string; labelAr: string }> = {
        [CONTRACT_STATUS.DRAFT]: { variant: 'info', labelEn: 'Draft', labelAr: 'مسودة' },
        [CONTRACT_STATUS.PENDING_BUYER]: { variant: 'pending', labelEn: 'Pending Buyer', labelAr: 'بانتظار المشتري' },
        [CONTRACT_STATUS.PENDING_SELLER]: { variant: 'pending', labelEn: 'Pending Seller', labelAr: 'بانتظار البائع' },
        [CONTRACT_STATUS.EXECUTED]: { variant: 'success', labelEn: 'Active', labelAr: 'نشط' },
        [CONTRACT_STATUS.CANCELLED]: { variant: 'error', labelEn: 'Cancelled', labelAr: 'ملغي' },
    };

    const config = configs[status] || { variant: 'info' as const, labelEn: status, labelAr: status };

    // If job is complete and contract is executed, show "Executed" instead of "Active"
    if (isJobComplete && status === CONTRACT_STATUS.EXECUTED) {
        return {
            variant: 'success',
            label: lang === 'ar' ? 'منفذ' : 'Executed',
        };
    }

    return {
        variant: config.variant,
        label: lang === 'ar' ? config.labelAr : config.labelEn,
    };
}

export function getQuoteStatusConfig(
    status: string,
    lang: 'en' | 'ar' = 'en'
): { variant: 'success' | 'warning' | 'error' | 'info' | 'pending'; label: string } {
    const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'pending'; labelEn: string; labelAr: string }> = {
        [QUOTE_STATUS.PENDING]: { variant: 'pending', labelEn: 'Pending', labelAr: 'قيد الانتظار' },
        [QUOTE_STATUS.ACCEPTED]: { variant: 'success', labelEn: 'Accepted', labelAr: 'مقبول' },
        [QUOTE_STATUS.DECLINED]: { variant: 'error', labelEn: 'Declined', labelAr: 'مرفوض' },
        [QUOTE_STATUS.NEGOTIATING]: { variant: 'warning', labelEn: 'Negotiating', labelAr: 'قيد التفاوض' },
        [QUOTE_STATUS.REVISION_REQUESTED]: { variant: 'warning', labelEn: 'Revision Requested', labelAr: 'طلب تعديل' },
    };

    const config = configs[status] || { variant: 'info' as const, labelEn: status, labelAr: status };
    return {
        variant: config.variant,
        label: lang === 'ar' ? config.labelAr : config.labelEn,
    };
}

export function getBookingStatusConfig(
    status: string,
    lang: 'en' | 'ar' = 'en'
): { variant: 'success' | 'warning' | 'error' | 'info' | 'pending'; label: string } {
    const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'pending'; labelEn: string; labelAr: string }> = {
        [BOOKING_STATUS.PENDING]: { variant: 'pending', labelEn: 'Pending', labelAr: 'قيد الانتظار' },
        [BOOKING_STATUS.ACCEPTED]: { variant: 'warning', labelEn: 'Accepted', labelAr: 'مقبول' },
        [BOOKING_STATUS.IN_PROGRESS]: { variant: 'info', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
        [BOOKING_STATUS.COMPLETED]: { variant: 'success', labelEn: 'Completed', labelAr: 'مكتمل' },
        [BOOKING_STATUS.CANCELLED]: { variant: 'error', labelEn: 'Cancelled', labelAr: 'ملغي' },
    };

    const config = configs[status] || { variant: 'info' as const, labelEn: status, labelAr: status };
    return {
        variant: config.variant,
        label: lang === 'ar' ? config.labelAr : config.labelEn,
    };
}
