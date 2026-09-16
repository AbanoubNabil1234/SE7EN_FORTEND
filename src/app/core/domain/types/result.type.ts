/**
 * Result Monad Pattern for functional, type-safe error handling.
 * Eliminates unexpected runtime exceptions across the domain and application layers.
 */
export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export const Result = {
  ok: <T>(data: T): Result<T, never> => ({ success: true, data }),
  fail: <E>(error: E): Result<never, E> => ({ success: false, error }),
};
