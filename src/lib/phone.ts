/**
 * Shared Indian mobile phone normalization + validation for signup and forms.
 */

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

export function validateIndianMobile(phone: string): { valid: boolean; error?: string } {
  const normalized = normalizePhoneDigits(phone);
  if (normalized.length !== 10) {
    return { valid: false, error: "Enter a valid 10-digit mobile number." };
  }
  if (!/^[6-9]/.test(normalized)) {
    return { valid: false, error: "Indian mobile numbers start with 6–9." };
  }
  return { valid: true };
}
