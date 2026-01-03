import { useState, useCallback } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
}

export const useFetchWithRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchWithRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: RetryOptions = {}
    ): Promise<T> => {
      const {
        maxRetries = 3,
        retryDelay = 1000,
        onRetry,
      } = options;

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            setIsRetrying(true);
            onRetry?.(attempt);
            await new Promise(resolve => 
              setTimeout(resolve, retryDelay * attempt)
            );
          }

          const result = await fn();
          setIsRetrying(false);
          return result;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Attempt ${attempt + 1} failed:`, error);

          if (attempt === maxRetries - 1) {
            setIsRetrying(false);
            throw lastError;
          }
        }
      }

      setIsRetrying(false);
      throw lastError;
    },
    []
  );

  return { fetchWithRetry, isRetrying };
};
