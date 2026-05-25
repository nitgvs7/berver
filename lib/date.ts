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

export function formatPtDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());

  return `${day}-${month}-${year}`;
}

export function todayPtDate(): string {
  const now = new Date();
  return formatPtDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function ptDateToIsoDate(value: string): string | null {
  const date = parsePtDate(value);

  if (!date) {
    return null;
  }

  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function nativeDateToPtDate(value: string): string {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}-${month}-${year}`;
}

export function ptDateToNativeDate(value: string): string {
  const [day, month, year] = value.split("-");

  if (!day || !month || !year || year.length !== 4) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function differenceInCalendarDays(laterDateValue: string, earlierDateValue: string): number | null {
  const laterDate = parsePtDate(laterDateValue);
  const earlierDate = parsePtDate(earlierDateValue);

  if (!laterDate || !earlierDate) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((laterDate.getTime() - earlierDate.getTime()) / millisecondsPerDay);
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
