/**
 * Derive a stable `admin_users.username` from an email local-part.
 * Used when email is the login identity; username remains a unique handle in DB.
 */

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/i;

export function usernameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "user").toLowerCase();
  const base = local
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  const candidate = base || "owner";
  return USERNAME_RE.test(candidate) ? candidate : "owner";
}
