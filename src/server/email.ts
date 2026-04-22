/**
 * email.ts — Resend transactional email helper.
 *
 * Why Resend
 * ----------
 * Modern, simple HTTP API, excellent deliverability, works out of the box on
 * Edge runtimes (plain fetch — no SDK required).
 *
 * Design
 * ------
 * - Single `sendEmail({ kind, to, vars, organizationId, adminUserId })`
 *   entry point. Every outbound email is logged to `email_events` so
 *   support can answer "did they get the welcome mail?" without opening
 *   the Resend dashboard.
 * - Templates live in this file as typed functions: each returns
 *   `{ subject, html, text }`. All HTML uses inline styles (no external
 *   stylesheets) so Outlook / Gmail render them correctly.
 * - Never throws on send failure; we capture the error in `email_events`
 *   and return a structured result. Callers can ignore or retry.
 * - Secrets read via `getEnv` only — never hardcoded.
 *
 * Required env vars (see CUETRONIX_ROLLOUT.md § Email):
 *   RESEND_API_KEY   (required)  e.g. re_XXXX…
 *   RESEND_FROM      (required)  e.g. "Cuetronix <hello@yourdomain.com>"
 *   APP_BASE_URL     (required)  e.g. "https://cuetronix.app"
 *   RESEND_REPLY_TO  (optional)  human reply-to address for support
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./adminApiUtils";

// ─────────────────────────────────────────────────────────────────────────────
// Template registry
// ─────────────────────────────────────────────────────────────────────────────

export type EmailKind =
  | "signup_welcome"
  | "verify_email"
  | "password_reset"
  | "payment_success"
  | "payment_failed"
  | "trial_ending"
  | "booking_confirmation"
  | "generic";

export interface BaseTemplateVars {
  displayName?: string;
  organizationName?: string;
  appBaseUrl: string;
}

export interface SignupWelcomeVars extends BaseTemplateVars {
  verifyUrl: string;
  dashboardUrl: string;
  trialEndsAt?: string;
}

export interface VerifyEmailVars extends BaseTemplateVars {
  verifyUrl: string;
  expiresInMinutes: number;
}

export interface PasswordResetVars extends BaseTemplateVars {
  resetUrl: string;
  expiresInMinutes: number;
  ipAddress?: string;
}

export interface PaymentSuccessVars extends BaseTemplateVars {
  amountDisplay: string;
  planName: string;
  invoiceNumber: string;
  periodEnd?: string;
  billingPortalUrl: string;
}

export interface PaymentFailedVars extends BaseTemplateVars {
  reason: string;
  retryUrl: string;
}

export interface TrialEndingVars extends BaseTemplateVars {
  daysRemaining: number;
  billingPortalUrl: string;
}

export interface BookingConfirmationVars extends BaseTemplateVars {
  stationName: string;
  whenDisplay: string;
  durationDisplay: string;
  amountDisplay?: string;
  locationName?: string;
}

export interface GenericVars extends BaseTemplateVars {
  subject: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

type TemplateVarsByKind = {
  signup_welcome: SignupWelcomeVars;
  verify_email: VerifyEmailVars;
  password_reset: PasswordResetVars;
  payment_success: PaymentSuccessVars;
  payment_failed: PaymentFailedVars;
  trial_ending: TrialEndingVars;
  booking_confirmation: BookingConfirmationVars;
  generic: GenericVars;
};

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface SendEmailOptions<K extends EmailKind> {
  kind: K;
  to: string;
  vars: TemplateVarsByKind[K];
  /** Attaches the event to an organisation in `email_events`. */
  organizationId?: string | null;
  /** Attaches the event to an admin user in `email_events`. */
  adminUserId?: string | null;
  /** Optional Supabase client for logging; if omitted we skip the audit row. */
  supabase?: SupabaseClient;
  /** Override reply-to on a per-send basis. */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail<K extends EmailKind>(
  opts: SendEmailOptions<K>,
): Promise<SendEmailResult> {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("RESEND_FROM");

  // Soft-skip instead of crashing if email infra isn't configured yet. This
  // lets the app run in a pre-Resend staging environment.
  if (!apiKey || !from) {
    console.warn(
      `[email] RESEND_API_KEY or RESEND_FROM missing — skipping ${opts.kind} to ${opts.to}`,
    );
    await recordEvent(opts, "failed", "resend_not_configured");
    return { ok: false, skipped: true, error: "Email not configured" };
  }

  const rendered = renderTemplate(opts.kind, opts.vars as never);
  const body: Record<string, unknown> = {
    from,
    to: [opts.to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    tags: [
      { name: "kind", value: opts.kind },
      ...(opts.organizationId ? [{ name: "org", value: opts.organizationId.slice(0, 32) }] : []),
    ],
  };
  const replyTo = opts.replyTo || getEnv("RESEND_REPLY_TO");
  if (replyTo) body.reply_to = replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = json.message || json.error?.message || `Resend ${res.status}`;
      console.warn(`[email] resend failed for ${opts.kind} -> ${opts.to}: ${msg}`);
      await recordEvent(opts, "failed", msg);
      return { ok: false, error: msg };
    }

    await recordEvent(opts, "sent", null, json.id ?? null);
    return { ok: true, id: json.id };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`[email] resend threw for ${opts.kind}:`, msg);
    await recordEvent(opts, "failed", msg);
    return { ok: false, error: msg };
  }
}

async function recordEvent<K extends EmailKind>(
  opts: SendEmailOptions<K>,
  status: "sent" | "failed",
  errorMessage: string | null,
  providerId?: string | null,
): Promise<void> {
  if (!opts.supabase) return;
  try {
    await opts.supabase.from("email_events").insert({
      organization_id: opts.organizationId ?? null,
      admin_user_id: opts.adminUserId ?? null,
      kind: opts.kind,
      to_email: opts.to,
      provider: "resend",
      provider_id: providerId ?? null,
      status,
      error_message: errorMessage,
    });
  } catch (e) {
    console.warn("[email] failed to write email_events row:", (e as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML shell
// ─────────────────────────────────────────────────────────────────────────────

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ShellOptions {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
  appBaseUrl: string;
}

function wrapShell(o: ShellOptions): string {
  const cta = o.cta
    ? `
    <tr><td style="padding-top:28px;padding-bottom:4px">
      <a href="${htmlEscape(o.cta.url)}"
         style="display:inline-block;background:linear-gradient(135deg,#d946ef,#6366f1);color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:14px;letter-spacing:0.01em">
         ${htmlEscape(o.cta.label)}
      </a>
    </td></tr>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${htmlEscape(o.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#0b0c16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e4e4e7">
<span style="display:none !important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${htmlEscape(o.preheader)}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0c16;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#11121f;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px 8px 32px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#d946ef,#6366f1);display:inline-block;line-height:36px;text-align:center;font-size:18px">✦</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:-0.01em">Cuetronix</div>
        </div>
      </td></tr>
      <tr><td style="padding:16px 32px 4px 32px">
        <h1 style="margin:0;font-size:24px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.01em">${htmlEscape(o.heading)}</h1>
      </td></tr>
      <tr><td style="padding:8px 32px 0 32px;color:#a1a1aa;font-size:15px;line-height:1.55">
        ${o.bodyHtml}
      </td></tr>
      <tr><td style="padding:0 32px">
        <table cellpadding="0" cellspacing="0" border="0">${cta}</table>
      </td></tr>
      <tr><td style="padding:32px 32px 28px 32px;border-top:1px solid rgba(255,255,255,0.06);margin-top:24px">
        <p style="margin:24px 0 0 0;color:#71717a;font-size:12px;line-height:1.55">
          ${o.footerNote ? htmlEscape(o.footerNote) + "<br /><br />" : ""}
          Sent from <a style="color:#a78bfa;text-decoration:none" href="${htmlEscape(o.appBaseUrl)}">Cuetronix</a> — the all-in-one operating system for gaming lounges, cafes, and clubs.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual templates
// ─────────────────────────────────────────────────────────────────────────────

function renderTemplate<K extends EmailKind>(
  kind: K,
  vars: TemplateVarsByKind[K],
): RenderedEmail {
  switch (kind) {
    case "signup_welcome": {
      const v = vars as SignupWelcomeVars;
      const greet = v.displayName || v.organizationName || "there";
      return {
        subject: `Welcome to Cuetronix — verify and launch ${v.organizationName ? v.organizationName : "your workspace"}`,
        text: [
          `Hey ${greet},`,
          ``,
          `Your Cuetronix workspace is ready.`,
          ``,
          `Before your first login, verify your email:`,
          v.verifyUrl,
          ``,
          `After verification, sign in and continue onboarding: ${v.dashboardUrl}`,
          ``,
          v.trialEndsAt
            ? `Your 14-day free trial runs until ${v.trialEndsAt}.`
            : "",
          `— The Cuetronix team`,
        ]
          .filter(Boolean)
          .join("\n"),
        html: wrapShell({
          preheader: "Your workspace is live. Verify email to unlock first login.",
          heading: `Welcome, ${v.displayName ? htmlEscape(v.displayName) : "operator"} — let's go live ✨`,
          bodyHtml: `
            <p style="margin:12px 0 0 0">Your workspace <strong style="color:#ffffff">${htmlEscape(v.organizationName || "Cuetronix")}</strong> has been provisioned and is waiting for you.</p>
            <p style="margin:14px 0 0 0">To protect your account and enable sign-in, confirm your email first. It takes one click.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;width:100%;border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden">
              <tr>
                <td style="padding:11px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">Workspace</td>
                <td style="padding:11px 14px;color:#ffffff;font-weight:600">${htmlEscape(v.organizationName || "—")}</td>
              </tr>
              <tr>
                <td style="padding:11px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Next step</td>
                <td style="padding:11px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">Verify email to unlock first login</td>
              </tr>
              ${v.trialEndsAt ? `<tr><td style="padding:11px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Trial until</td><td style="padding:11px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.trialEndsAt)}</td></tr>` : ""}
            </table>
          `,
          cta: { label: "Verify Email & Continue", url: v.verifyUrl },
          footerNote: `Once verified, sign in and continue setup: ${v.dashboardUrl}`,
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "verify_email": {
      const v = vars as VerifyEmailVars;
      return {
        subject: "Confirm your Cuetronix email",
        text: `Confirm your email (valid for ${v.expiresInMinutes} minutes):\n${v.verifyUrl}\n\nIf you didn't request this, ignore this message.`,
        html: wrapShell({
          preheader: "Confirm your email to protect your Cuetronix workspace.",
          heading: "Confirm your email",
          bodyHtml: `<p style="margin:12px 0 0 0">Click the button below to confirm this address. The link is valid for <strong>${v.expiresInMinutes} minutes</strong> and can only be used once.</p>`,
          cta: { label: "Confirm email", url: v.verifyUrl },
          footerNote: "If you didn't request this, it's safe to ignore this email.",
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "password_reset": {
      const v = vars as PasswordResetVars;
      return {
        subject: "Reset your Cuetronix password",
        text: `Someone asked to reset your password. If that was you, use this link within ${v.expiresInMinutes} minutes:\n${v.resetUrl}\n\nIf not, ignore this message${v.ipAddress ? ` (request came from ${v.ipAddress})` : ""}.`,
        html: wrapShell({
          preheader: "Password reset link — valid once, expires soon.",
          heading: "Reset your password",
          bodyHtml: `
            <p style="margin:12px 0 0 0">We received a request to reset the password for this account. If that was you, click below to set a new one. This link is valid for <strong>${v.expiresInMinutes} minutes</strong> and can only be used once.</p>
            ${v.ipAddress ? `<p style="margin:14px 0 0 0;font-size:12px;color:#71717a">Request origin: ${htmlEscape(v.ipAddress)}</p>` : ""}
          `,
          cta: { label: "Reset password", url: v.resetUrl },
          footerNote: "If you didn't request this, your password is still safe — just ignore this email.",
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "payment_success": {
      const v = vars as PaymentSuccessVars;
      return {
        subject: `Payment received · ${v.invoiceNumber}`,
        text: [
          `Thanks for the payment!`,
          ``,
          `Plan: ${v.planName}`,
          `Amount: ${v.amountDisplay}`,
          `Invoice: ${v.invoiceNumber}`,
          v.periodEnd ? `Next renewal: ${v.periodEnd}` : "",
          ``,
          `Invoice & billing history: ${v.billingPortalUrl}`,
        ]
          .filter(Boolean)
          .join("\n"),
        html: wrapShell({
          preheader: `Payment received — invoice ${v.invoiceNumber}. Thanks for running on Cuetronix.`,
          heading: "Payment received 🎉",
          bodyHtml: `
            <p style="margin:12px 0 0 0">Thanks${v.displayName ? `, ${htmlEscape(v.displayName)}` : ""}. Your payment went through cleanly.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;width:100%;border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
              <tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">Plan</td><td style="padding:10px 14px;color:#ffffff;font-weight:600">${htmlEscape(v.planName)}</td></tr>
              <tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Amount</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.amountDisplay)}</td></tr>
              <tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Invoice</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06);font-family:ui-monospace,Menlo,monospace">${htmlEscape(v.invoiceNumber)}</td></tr>
              ${v.periodEnd ? `<tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Next renewal</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.periodEnd)}</td></tr>` : ""}
            </table>
          `,
          cta: { label: "View billing portal", url: v.billingPortalUrl },
          footerNote: "This is your receipt — keep it for your records.",
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "payment_failed": {
      const v = vars as PaymentFailedVars;
      return {
        subject: "Payment failed · action needed",
        text: `Your Cuetronix subscription payment failed: ${v.reason}\n\nRetry: ${v.retryUrl}`,
        html: wrapShell({
          preheader: "Your subscription payment didn't go through.",
          heading: "Payment didn't go through",
          bodyHtml: `
            <p style="margin:12px 0 0 0">Your most recent payment to Cuetronix failed. Reason: <strong style="color:#ffffff">${htmlEscape(v.reason)}</strong></p>
            <p style="margin:12px 0 0 0">Retry the payment below, or update your card. Your workspace stays active for 7 days while we keep trying.</p>
          `,
          cta: { label: "Retry payment", url: v.retryUrl },
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "trial_ending": {
      const v = vars as TrialEndingVars;
      return {
        subject: `Your Cuetronix trial ends in ${v.daysRemaining} day${v.daysRemaining === 1 ? "" : "s"}`,
        text: `Your free trial ends in ${v.daysRemaining} day(s). Pick a plan to keep your workspace running: ${v.billingPortalUrl}`,
        html: wrapShell({
          preheader: `Trial ending in ${v.daysRemaining} day(s). Pick a plan to keep going.`,
          heading: "Your trial is ending soon",
          bodyHtml: `
            <p style="margin:12px 0 0 0">Your free trial ends in <strong>${v.daysRemaining} day${v.daysRemaining === 1 ? "" : "s"}</strong>. Pick a plan now and nothing changes — same data, same workspace, same branding.</p>
          `,
          cta: { label: "Choose a plan", url: v.billingPortalUrl },
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "booking_confirmation": {
      const v = vars as BookingConfirmationVars;
      return {
        subject: `Booking confirmed · ${v.stationName} · ${v.whenDisplay}`,
        text: [
          `Booking confirmed!`,
          `Station: ${v.stationName}`,
          `When: ${v.whenDisplay}`,
          `Duration: ${v.durationDisplay}`,
          v.amountDisplay ? `Amount: ${v.amountDisplay}` : "",
          v.locationName ? `Where: ${v.locationName}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: wrapShell({
          preheader: `Booking confirmed — ${v.stationName}, ${v.whenDisplay}`,
          heading: "Your booking is confirmed 🎮",
          bodyHtml: `
            <p style="margin:12px 0 0 0">See you soon${v.displayName ? `, ${htmlEscape(v.displayName)}` : ""}.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;width:100%;border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
              <tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">Station</td><td style="padding:10px 14px;color:#ffffff;font-weight:600">${htmlEscape(v.stationName)}</td></tr>
              <tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">When</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.whenDisplay)}</td></tr>
              <tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Duration</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.durationDisplay)}</td></tr>
              ${v.amountDisplay ? `<tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Paid</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.amountDisplay)}</td></tr>` : ""}
              ${v.locationName ? `<tr><td style="padding:10px 14px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.06)">Where</td><td style="padding:10px 14px;color:#ffffff;font-weight:600;border-top:1px solid rgba(255,255,255,0.06)">${htmlEscape(v.locationName)}</td></tr>` : ""}
            </table>
          `,
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }

    case "generic": {
      const v = vars as GenericVars;
      return {
        subject: v.subject,
        text: `${v.heading}\n\n${v.bodyHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}\n${v.ctaUrl ? `\n${v.ctaUrl}\n` : ""}`,
        html: wrapShell({
          preheader: v.heading,
          heading: v.heading,
          bodyHtml: v.bodyHtml,
          cta: v.ctaLabel && v.ctaUrl ? { label: v.ctaLabel, url: v.ctaUrl } : undefined,
          appBaseUrl: v.appBaseUrl,
        }),
      };
    }
  }
  throw new Error(`Unknown email kind: ${kind as string}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Builds the absolute app base URL from env, tolerating trailing slashes. */
export function appBaseUrl(): string {
  const raw = getEnv("APP_BASE_URL") || getEnv("VITE_APP_BASE_URL") || "https://cuetronix.app";
  return raw.replace(/\/+$/, "");
}
