export const JOB_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
} as const;

export const QUOTE_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    NEGOTIATING: 'negotiating',
    CONTRACT_PENDING: 'contract_pending',
    CONTRACT_ACCEPTED: 'contract_accepted'
} as const;

export const URGENCY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];
export type QuoteStatus = typeof QUOTE_STATUS[keyof typeof QUOTE_STATUS];
export type UrgencyLevel = typeof URGENCY_LEVELS[keyof typeof URGENCY_LEVELS];
