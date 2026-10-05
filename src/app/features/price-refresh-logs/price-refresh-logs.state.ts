/**
 * Pure state transitions for the price refresh retry actions (plan 2026-10-05 §6).
 * Kept free of Angular so the node strip-types runner can exercise them: one busy
 * slot per action (a row click never unlocks a pharmacy action and vice versa) and
 * one idempotency key per logical request — kept across a failed attempt so a
 * network retry stays the same request on the server, dropped after success.
 */

export interface RetryActionsState {
  readonly busyActionIds: ReadonlySet<string>;
  /** actionKey → idempotency key for requests that failed mid-flight. */
  readonly retryKeys: Readonly<Record<string, string>>;
}

export function retryActionKeyForItem(itemId: string): string {
  return `item:${itemId}`;
}

export function retryActionKeyForPharmacy(pharmacyId: string): string {
  return `pharmacy:${pharmacyId}`;
}

export function isRetryBusy(state: RetryActionsState, actionKey: string): boolean {
  return state.busyActionIds.has(actionKey);
}

export function retryKeyFor(state: RetryActionsState, actionKey: string): string {
  return state.retryKeys[actionKey] ?? '';
}

/** Starts an action: marks it busy and assigns/reuses its idempotency key. */
export function startRetryAction(
  state: RetryActionsState,
  actionKey: string,
  newIdempotencyKey: string
): RetryActionsState {
  if (state.busyActionIds.has(actionKey)) return state;
  return {
    busyActionIds: new Set(state.busyActionIds).add(actionKey),
    retryKeys: state.retryKeys[actionKey]
      ? state.retryKeys
      : { ...state.retryKeys, [actionKey]: newIdempotencyKey }
  };
}

/** Action failed: release the busy slot but KEEP the key (network retry = same request). */
export function failRetryAction(state: RetryActionsState, actionKey: string): RetryActionsState {
  if (!state.busyActionIds.has(actionKey)) return state;
  const busy = new Set(state.busyActionIds);
  busy.delete(actionKey);
  return { busyActionIds: busy, retryKeys: state.retryKeys };
}

/** Action succeeded: release the busy slot and drop the used key. */
export function succeedRetryAction(state: RetryActionsState, actionKey: string): RetryActionsState {
  if (!state.busyActionIds.has(actionKey)) return state;
  const busy = new Set(state.busyActionIds);
  busy.delete(actionKey);
  const keys = { ...state.retryKeys };
  delete keys[actionKey];
  return { busyActionIds: busy, retryKeys: keys };
}

export function emptyRetryActionsState(): RetryActionsState {
  return { busyActionIds: new Set(), retryKeys: {} };
}

/** New idempotency key for a fresh logical request. */
export function newIdempotencyKey(): string {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoObj && 'randomUUID' in cryptoObj) return cryptoObj.randomUUID();
  return `retry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
