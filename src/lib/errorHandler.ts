import { z } from 'zod';

/**
 * Centralized error handling utility
 * Formats errors for user-friendly display
 */
export const handleError = (error: unknown, context: string): string => {
  // Log full error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
  
  // Zod validation errors
  if (error instanceof z.ZodError) {
    const issues = error.issues || [];
    return issues[0]?.message || 'Validation error';
  }
  
  // Standard Error objects
  if (error instanceof Error) {
    // Don't expose internal error messages to users
    // Only show user-friendly generic message
    return 'An unexpected error occurred. Please try again.';
  }
  
  // Unknown error type
  return 'Something went wrong. Please try again later.';
};

/**
 * Safe error message extraction
 * Only returns safe, user-friendly messages
 */
export const getSafeErrorMessage = (error: any): string => {
  // Known safe error messages from Supabase Auth
  const safeMessages = [
    'Invalid login credentials',
    'Email not confirmed',
    'User already registered',
    'Password should be at least 6 characters',
  ];
  
  const message = error?.message || '';
  
  if (safeMessages.some(safe => message.includes(safe))) {
    return message;
  }
  
  // Default safe message
  return 'An error occurred. Please try again.';
};
