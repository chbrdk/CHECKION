/* ------------------------------------------------------------------ */
/*  CHECKION – Admin API key auth (for PLEXON / external user mgmt)    */
/* ------------------------------------------------------------------ */

/**
 * Validates Authorization: Bearer <CHECKION_ADMIN_API_KEY>.
 * Returns true if the request is authorized for admin operations (list/update/delete users).
 */
export function isAdminApiRequest(request: Request): boolean {
  const key = process.env.CHECKION_ADMIN_API_KEY;
  if (!key || key.length < 16) return false;
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  return token === key;
}
