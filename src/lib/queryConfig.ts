/**
 * Global Query Configuration and Constants
 *
 * Standardized stale times to prevent cache thrashing and improve performance.
 */
export const STALE_TIME = {
    // Static data that rarely changes (5 minutes)
    STATIC: 5 * 60 * 1000,

    // Dynamic data like lists of requests/quotes (1 minute)
    // This prevents refetching when navigating back/forth quickly
    DYNAMIC: 60 * 1000,

    // Realtime data that should be fresh but not immediate (30s)
    SHORT: 30 * 1000,

    // Data that must always be fresh (0)
    REALTIME: 0
} as const;

/**
 * Global garbage-collection times. Keep cache alive well beyond staleTime so
 * navigating back doesn't flash empty content while a refetch is in-flight.
 */
export const GC_TIME = {
    // Long-lived cache entries (10 minutes)
    LONG: 10 * 60 * 1000,

    // Standard cache entries (5 minutes)
    STANDARD: 5 * 60 * 1000,

    // Short-lived entries that don't need to be held long (2 minutes)
    SHORT: 2 * 60 * 1000,
} as const;

/**
 * Polling intervals — centralised so we can tune them in one place.
 * Use NONE for queries that rely on realtime subscriptions or manual invalidation.
 */
export const REFETCH_INTERVAL = {
    // Active-job / seller home state polling (15s is sufficient; 8s caused excessive DB load)
    ACTIVE_JOB: 15_000,

    // Buyer home active-requests polling (15s; seller acceptance is also pushed via invalidation)
    BUYER_ACTIVE: 15_000,

    // Opportunities polling (30s is already good)
    OPPORTUNITIES: 30_000,

    // Disabled — query is refreshed manually or via invalidation
    NONE: false as const,
} as const;

export const QUERY_KEYS = {
    notifications: 'notifications',
    messages: 'messages',
    activeContracts: 'active-contracts',
    pendingContracts: 'pending-contracts',
    jobIssues: 'job-issues',
    profile: 'profile'
} as const;
