import type { PaymentMode } from "./payment-provider.js";

export type StoredModeCredentials = {
  key_id?: string;
  key_secret_enc?: string;
  webhook_secret_enc?: string;
};

export type GatewayCredentialSettings = {
  credentials?: Partial<Record<PaymentMode, StoredModeCredentials>>;
};

/** Find stored credentials even when row.mode disagrees with the key slot (test vs live mismatch). */
export function findStoredCredentialSlot(
  settings: GatewayCredentialSettings,
  preferredMode?: PaymentMode,
): { mode: PaymentMode; creds: StoredModeCredentials } | null {
  const modes: PaymentMode[] = preferredMode
    ? [preferredMode, preferredMode === "test" ? "live" : "test"]
    : ["test", "live"];
  for (const m of modes) {
    const creds = settings.credentials?.[m];
    if (creds?.key_id && creds.key_secret_enc) {
      return { mode: m, creds };
    }
  }
  return null;
}
