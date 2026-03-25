import {
  isMissingSupabaseRelationError,
  markSupabaseRelationAvailable,
  rememberMissingSupabaseRelation,
} from '@/lib/supabaseSchema';

type SupabaseResponse<T> = {
  data: T | null;
  error: any;
};

interface ExecuteSupabaseQueryOptions<T> {
  context?: string;
  fallbackData: T;
  relationName?: string;
  retries?: number;
  throwOnError?: boolean;
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_SUPABASE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENETUNREACH',
  'PGRST003',
]);

const RETRYABLE_MESSAGE_PATTERNS = [
  'failed to fetch',
  'network request failed',
  'networkerror',
  'load failed',
  'timed out',
  'timeout',
  'gateway timeout',
  'service unavailable',
  'rate limit',
  'too many requests',
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractErrorMessage = (error: any) =>
  [error?.message, error?.details, error?.hint, error?.error_description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const getSupabaseRetryDelay = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 5000);

export const isRetryableSupabaseError = (error: any) => {
  if (!error) return false;
  if (isMissingSupabaseRelationError(error, '')) return false;

  const status = Number(error?.status ?? error?.response?.status);
  if (RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  const code = String(error?.code ?? '').toUpperCase();
  if (RETRYABLE_SUPABASE_CODES.has(code)) {
    return true;
  }

  const message = extractErrorMessage(error);
  if (RETRYABLE_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return true;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  return false;
};

export const shouldRetryReactQuery = (
  failureCount: number,
  error: unknown,
  maxRetries = 2,
) => failureCount < maxRetries && isRetryableSupabaseError(error);

export async function executeSupabaseQuery<T>(
  queryFactory: () => Promise<SupabaseResponse<T>>,
  {
    context = 'supabase-query',
    fallbackData,
    relationName,
    retries = 2,
    throwOnError = false,
  }: ExecuteSupabaseQueryOptions<T>,
): Promise<T> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    const { data, error } = await queryFactory();

    if (!error) {
      if (relationName) {
        markSupabaseRelationAvailable(relationName);
      }
      return (data ?? fallbackData) as T;
    }

    lastError = error;

    if (relationName && isMissingSupabaseRelationError(error, relationName)) {
      rememberMissingSupabaseRelation(error, relationName);
      return fallbackData;
    }

    const canRetry = attempt < retries && isRetryableSupabaseError(error);
    if (!canRetry) {
      break;
    }

    attempt += 1;
    await delay(getSupabaseRetryDelay(attempt - 1));
  }

  if (import.meta.env.DEV) {
    console.warn(`[${context}]`, lastError);
  }

  if (throwOnError && lastError) {
    throw lastError;
  }

  return fallbackData;
}
