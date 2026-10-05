/**
 * Admin catalog moderation gate.
 * Kept free of Angular imports so the node test runner can verify the rules.
 */

/** Only the persisted Admin role may hide/show/delete catalog entries — staff
 * permissions (including wildcard `*`) never grant moderation. */
export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? '').trim().toLowerCase() === 'admin';
}
