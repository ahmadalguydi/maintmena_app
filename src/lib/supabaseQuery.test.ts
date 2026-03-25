import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearKnownUnavailableSupabaseRelations,
  isSupabaseRelationKnownUnavailable,
} from '@/lib/supabaseSchema';
import {
  executeSupabaseQuery,
  isRetryableSupabaseError,
  shouldRetryReactQuery,
} from '@/lib/supabaseQuery';

describe('supabaseQuery', () => {
  afterEach(() => {
    clearKnownUnavailableSupabaseRelations();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('treats transient Supabase errors as retryable', () => {
    expect(isRetryableSupabaseError({ status: 503, message: 'Service unavailable' })).toBe(true);
    expect(isRetryableSupabaseError({ message: 'Failed to fetch' })).toBe(true);
    expect(isRetryableSupabaseError({ status: 400, message: 'Bad request' })).toBe(false);
  });

  it('uses retry policy only for retryable failures within the retry budget', () => {
    expect(shouldRetryReactQuery(0, { status: 503 }, 2)).toBe(true);
    expect(shouldRetryReactQuery(2, { status: 503 }, 2)).toBe(false);
    expect(shouldRetryReactQuery(0, { status: 400 }, 2)).toBe(false);
  });

  it('retries transient failures and returns the eventual data', async () => {
    vi.useFakeTimers();

    const runner = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { status: 503, message: 'Service unavailable' } })
      .mockResolvedValueOnce({ data: ['ok'], error: null });

    const promise = executeSupabaseQuery(() => runner(), {
      context: 'test-query',
      fallbackData: [],
      relationName: 'profiles',
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual(['ok']);
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('fails fast for missing relations and then expires the cache entry', async () => {
    vi.useFakeTimers();

    const runner = vi.fn().mockResolvedValue({
      data: null,
      error: {
        status: 404,
        code: 'PGRST205',
        message: "Could not find the table 'public.messages' in the schema cache",
      },
    });

    const promise = executeSupabaseQuery(
      async () => runner(),
      {
        context: 'missing-messages',
        fallbackData: [],
        relationName: 'messages',
      },
    );

    await vi.runAllTimersAsync();
    await promise;

    expect(runner).toHaveBeenCalledTimes(1);
    expect(isSupabaseRelationKnownUnavailable('messages')).toBe(true);

    vi.advanceTimersByTime(2 * 60 * 1000 + 1);

    expect(isSupabaseRelationKnownUnavailable('messages')).toBe(false);
  });

  it('returns fallback data immediately when a relation is missing', async () => {
    const runner = vi.fn().mockResolvedValue({
      data: null,
      error: {
        status: 404,
        code: 'PGRST205',
        message: "Could not find the table 'public.messages' in the schema cache",
      },
    });

    await expect(
      executeSupabaseQuery(() => runner(), {
        context: 'transient-missing-messages',
        fallbackData: [],
        relationName: 'messages',
      }),
    ).resolves.toEqual([]);
    expect(isSupabaseRelationKnownUnavailable('messages')).toBe(true);
  });
});
