/**
 * Journey stage definitions for booking and quote flows
 * Used by the JourneyTimeline component to show progress
 */

export interface JourneyStage {
    id: string;
    labelEn: string;
    labelAr: string;
}

// Stage indices: 0 = start, 3 = completed (job active)
export const BOOKING_BUYER_STAGES: JourneyStage[] = [
    { id: 'sent', labelEn: 'Booking Sent', labelAr: 'تم إرسال الحجز' },
    { id: 'accepted', labelEn: 'Seller Accepted', labelAr: 'البائع وافق' },
    { id: 'buyer_signed', labelEn: 'You Signed', labelAr: 'وقعت العقد' },
    { id: 'active', labelEn: 'Job Active', labelAr: 'العمل فعّال' },
];

export const BOOKING_SELLER_STAGES: JourneyStage[] = [
    { id: 'received', labelEn: 'Booking Received', labelAr: 'تم استلام حجز' },
    { id: 'confirmed', labelEn: 'You Confirmed', labelAr: 'أرسلت تأكيدك' },
    { id: 'buyer_signed', labelEn: 'Buyer Signed', labelAr: 'المشتري وقّع' },
    { id: 'active', labelEn: 'Job Active', labelAr: 'العمل فعّال' },
];

export const QUOTE_BUYER_STAGES: JourneyStage[] = [
    { id: 'request_sent', labelEn: 'Request Sent', labelAr: 'تم إرسال الطلب' },
    { id: 'quote_selected', labelEn: 'Quote Selected', labelAr: 'تم اختيار العرض' },
    { id: 'buyer_signed', labelEn: 'You Signed', labelAr: 'وقعت العقد' },
    { id: 'active', labelEn: 'Job Active', labelAr: 'العمل فعّال' },
];

export const QUOTE_SELLER_STAGES: JourneyStage[] = [
    { id: 'quote_sent', labelEn: 'Quote Sent', labelAr: 'أرسلت العرض' },
    { id: 'quote_accepted', labelEn: 'Buyer Accepted', labelAr: 'المشتري وافق' },
    { id: 'buyer_signed', labelEn: 'Buyer Signed', labelAr: 'المشتري وقّع' },
    { id: 'active', labelEn: 'Job Active', labelAr: 'العمل فعّال' },
];

export type FlowType = 'booking' | 'quote';
export type UserRole = 'buyer' | 'seller';

export function getStagesForFlow(flowType: FlowType, role: UserRole): JourneyStage[] {
    if (flowType === 'booking') {
        return role === 'buyer' ? BOOKING_BUYER_STAGES : BOOKING_SELLER_STAGES;
    }
    return role === 'buyer' ? QUOTE_BUYER_STAGES : QUOTE_SELLER_STAGES;
}

interface StatusData {
    bookingStatus?: string;      // booking_requests.status
    contractStatus?: string;     // contracts.status
    buyerSigned?: boolean;       // contracts.signed_at_buyer !== null
    sellerSigned?: boolean;      // contracts.signed_at_seller !== null
    quoteStatus?: string;        // quote_submissions.status (for quote flow)
    requestStatus?: string;      // maintenance_requests.status
}

/**
 * Derive the current stage index (0-3) from booking/contract/quote status
 */
export function deriveStageIndex(
    flowType: FlowType,
    role: UserRole,
    data: StatusData
): number {
    const { bookingStatus, contractStatus, buyerSigned, sellerSigned, quoteStatus, requestStatus } = data;

    // Stage 3: Both parties signed - job is active
    if (buyerSigned && sellerSigned) {
        return 3;
    }

    if (flowType === 'booking') {
        // Stage 2: Buyer signed (waiting for seller)
        if (buyerSigned) {
            return 2;
        }
        // Stage 1: Seller accepted booking
        if (bookingStatus === 'accepted' || bookingStatus === 'contract_pending' || contractStatus) {
            return 1;
        }
        // Stage 0: Booking sent, pending
        return 0;
    }

    // Quote flow
    if (flowType === 'quote') {
        // Stage 2: Buyer signed (waiting for seller)
        if (buyerSigned) {
            return 2;
        }
        // Stage 1: Quote selected/accepted
        if (quoteStatus === 'accepted' || contractStatus) {
            return 1;
        }
        // Stage 0: Request sent (buyer) or Quote sent (seller)
        return 0;
    }

    return 0;
}
