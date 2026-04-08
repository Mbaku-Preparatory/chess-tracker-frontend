export function normalizeKenyanPhoneNumber(value: string): string {
  const cleaned = value.trim().replace(/[^\d+]/g, "");
  const withoutPlus = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;

  if (withoutPlus.startsWith("0")) {
    return `254${withoutPlus.slice(1)}`;
  }

  return withoutPlus;
}

export function isValidKenyanPhoneNumber(value: string): boolean {
  return /^254[17]\d{8}$/.test(normalizeKenyanPhoneNumber(value));
}

export function formatKenyanPhoneNumber(value: string): string {
  const normalized = normalizeKenyanPhoneNumber(value);

  if (!isValidKenyanPhoneNumber(normalized)) {
    return value.trim();
  }

  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
}
