const PT_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parsePtDate(value: string): Date | null {
  const trimmed = value.trim();
  const ptMatch = PT_DATE_PATTERN.exec(trimmed);
  const isoMatch = ISO_DATE_PATTERN.exec(trimmed);

  const day = ptMatch?.[1] ?? isoMatch?.[3];
  const month = ptMatch?.[2] ?? isoMatch?.[2];
  const year = ptMatch?.[3] ?? isoMatch?.[1];

  if (!day || !month || !year) {
    return null;
  }

  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  if (
    date.getUTCFullYear() !== yearNumber ||
    date.getUTCMonth() !== monthNumber - 1 ||
    date.getUTCDate() !== dayNumber
  ) {
    return null;
  }

  return date;
}

export function isValidPtDate(value: string): boolean {
  return parsePtDate(value) !== null;
}

export function dateToYYMMDD(value: string): string | null {
  const date = parsePtDate(value);

  if (!date) {
    return null;
  }

  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export function formatDateInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{2})(\d)/, "$1-$2").replace(/^(\d{2})-(\d{2})(\d)/, "$1-$2-$3");
}
