/**
 * emailTokens.ts — single-use hashed tokens for email verification and
 * password reset, stored in `admin_user_email_tokens`.
 *
 * Why hashed
 * ----------
 * The raw token is what the user clicks (goes into the email URL). Storing
 * it as a SHA-256 hash means a DB leak doesn't hand an attacker a working
 * link — they'd need the pre-image.
 *
 * Why single-use
 * --------------
 * Every row has a `consumed_at`. On successful consumption we stamp it, so
 * the same link stops working. Expired rows are ignored. An optional
 * purge helper drops rows older than 7 days if the caller wants to keep
 * the table lean.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailTokenPurpose = "verify_email" | "reset_password";

/** PostgREST / network errors don't always populate `message`. */
function formatSupabaseWriteError(err: unknown): string {
  if (err == null) return "unknown error (null)";
  if (typeof err === "string") return err;
  if (typeof err !== "object") return String(err);
  const o = err as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
  const parts = [o.message, o.details, o.hint, o.code ? `code ${o.code}` : ""].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  );
  if (parts.length) return parts.join(" — ");
  try {
    const s = JSON.stringify(err);
    if (s === "{}" || s === "[]") return "empty error object from database API (check network / Supabase logs)";
    return s;
  } catch {
    return "unserializable error from database client";
  }
}

const TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export interface IssueTokenOptions {
  supabase: SupabaseClient;
  adminUserId: string;
  email: string;
  purpose: EmailTokenPurpose;
  ttlMinutes: number;
  requestedIp?: string | null;
  requestedUa?: string | null;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Issue a new token. The returned `token` is what belongs in the email URL.
 * Any previously-issued unconsumed tokens of the same purpose for this user
 * are invalidated (marked consumed with a sentinel) so only the newest link
 * works — a simple protection against stale-link attacks.
 */
export async function issueEmailToken(opts: IssueTokenOptions): Promise<IssuedToken> {
  const emailNorm = opts.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    throw new Error("issueEmailToken: invalid email address");
  }

  const raw = toBase64Url(randomBytes(TOKEN_BYTES));
  const tokenHash = await sha256Hex(raw);
  const expiresAt = new Date(Date.now() + opts.ttlMinutes * 60 * 1000);

  // Invalidate prior unconsumed tokens of the same purpose.
  const { error: invErr } = await opts.supabase
    .from("admin_user_email_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("admin_user_id", opts.adminUserId)
    .eq("purpose", opts.purpose)
    .is("consumed_at", null);
  if (invErr) {
    console.warn("[issueEmailToken] invalidate prior:", formatSupabaseWriteError(invErr));
  }

  const { error } = await opts.supabase.from("admin_user_email_tokens").insert({
    admin_user_id: opts.adminUserId,
    purpose: opts.purpose,
    token_hash: tokenHash,
    email: emailNorm,
    expires_at: expiresAt.toISOString(),
    requested_ip:
      opts.requestedIp != null && String(opts.requestedIp).trim() !== ""
        ? String(opts.requestedIp).slice(0, 512)
        : null,
    requested_ua:
      opts.requestedUa != null && String(opts.requestedUa).trim() !== ""
        ? String(opts.requestedUa).slice(0, 4096)
        : null,
  });
  if (error) throw new Error(`issueEmailToken: ${formatSupabaseWriteError(error)}`);

  return { token: raw, expiresAt };
}

export interface ConsumeTokenResult {
  ok: boolean;
  adminUserId?: string;
  email?: string;
  error?: string;
}

/**
 * Look up a token by hash, mark it consumed, and return the associated user.
 * Rejects expired or already-consumed tokens. Does NOT update the user row —
 * the caller decides what "consumed" means (set email_verified_at, rotate
 * password, etc).
 */
export async function consumeEmailToken(
  supabase: SupabaseClient,
  rawToken: string,
  purpose: EmailTokenPurpose,
): Promise<ConsumeTokenResult> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 16) {
    return { ok: false, error: "Invalid token." };
  }

  const tokenHash = await sha256Hex(rawToken);

  const { data: row, error } = await supabase
    .from("admin_user_email_tokens")
    .select("id, admin_user_id, email, expires_at, consumed_at, purpose")
    .eq("token_hash", tokenHash)
    .eq("purpose", purpose)
    .maybeSingle();

  if (error) return { ok: false, error: formatSupabaseWriteError(error) };
  if (!row) return { ok: false, error: "Token not found." };
  if (row.consumed_at) return { ok: false, error: "This link has already been used." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "This link has expired." };
  }

  const { error: markErr } = await supabase
    .from("admin_user_email_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (markErr) return { ok: false, error: formatSupabaseWriteError(markErr) };

  return { ok: true, adminUserId: row.admin_user_id, email: row.email };
}
