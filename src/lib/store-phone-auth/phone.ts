/** Normalización de celular para la tienda. No toca TallerGestio ni Auth de staff. */

export const PHONE_PLACEHOLDER_DOMAIN = "phone.movilzone.local";

export function looksLikeEmail(value: string) {
  return value.trim().includes("@");
}

export function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return !looksLikeEmail(value) && digits.length >= 8 && digits.length <= 15;
}

export function normalizeStorePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54") && digits.length >= 11) {
    const rest = digits.slice(2);
    if (rest.startsWith("9")) return `54${rest}`;
    return `549${rest}`;
  }
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10) return `549${digits}`;
  if (digits.length >= 8 && digits.length <= 13) return digits;
  return null;
}

export function displayStorePhone(normalized: string) {
  if (normalized.startsWith("549") && normalized.length >= 12) {
    const local = normalized.slice(3);
    if (local.startsWith("11") && local.length === 10) {
      return `+54 9 11 ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return `+54 9 ${local}`;
  }
  return normalized.startsWith("54") ? `+${normalized}` : normalized;
}

export function phonePlaceholderEmail(normalized: string) {
  return `p${normalized}@${PHONE_PLACEHOLDER_DOMAIN}`;
}

export function isPhonePlaceholderEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${PHONE_PLACEHOLDER_DOMAIN}`);
}
