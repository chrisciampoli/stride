import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Extract the actual error message from a Supabase edge function error.
 * `FunctionsHttpError.message` is always the generic "Edge Function returned
 * a non-2xx status code" — the real error is in the response body JSON.
 */
export async function getEdgeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const data = await error.context.json();
      if (data?.error && typeof data.error === 'string') return data.error;
    } catch {
      // Response isn't JSON — fall through
    }
  }
  return (error as Error)?.message || 'An unexpected error occurred';
}
