// Single source of truth for recognizing the admin panel's dedicated
// hostname, shared by src/proxy.ts (routing) and requireAdmin() (redirect
// targets) so the two never drift out of sync.

/**
 * A hostname prefixed with "admin." is treated as the admin panel's clean-URL
 * host — admin.cookreels.com in production, admin.localhost in local dev.
 * Checked generically (prefix match, not a hardcoded full domain) so this
 * keeps working for any future environment (staging, preview subdomains)
 * without code changes.
 */
export function isAdminHost(hostname: string): boolean {
  return hostname.startsWith('admin.')
}

/** Strips the ":port" suffix (if any) off a raw `Host` header value. */
export function hostnameFromHeader(hostHeader: string | null): string {
  return (hostHeader ?? '').split(':')[0]
}

/** True for the plain local dev host, where /admin/* is still reachable by path. */
export function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}
