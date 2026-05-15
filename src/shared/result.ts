/**
 * src-v2/shared/result.ts
 * Result monad utilities.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Wrap a value in an ok result.
 */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/**
 * Wrap an error in a failed result.
 */
export function err(error: string): Result<never> {
  return { ok: false, error };
}

/**
 * Map a result value via a function.
 */
export function mapResult<T, U>(r: Result<T>, fn: (t: T) => U): Result<U> {
  if (r.ok) {
    return { ok: true, value: fn(r.value) };
  }
  return r;
}
