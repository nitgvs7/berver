export const DEFAULT_COMPANY_PREFIX = "5603936";
export const DEFAULT_EXTENSION_DIGIT = "3";
export const DEFAULT_SERIAL_START = 500000;

export function calculateGS1CheckDigit(valueWithoutCheckDigit: string): string {
  const digits = valueWithoutCheckDigit.replace(/\D/g, "");

  if (!digits) {
    throw new Error("GS1 value must contain digits.");
  }

  let sum = 0;
  let shouldTriple = true;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const digit = Number(digits[index]);
    sum += shouldTriple ? digit * 3 : digit;
    shouldTriple = !shouldTriple;
  }

  return String((10 - (sum % 10)) % 10);
}

export function generateSSCC(
  serial: number,
  companyPrefix = DEFAULT_COMPANY_PREFIX,
  extensionDigit = DEFAULT_EXTENSION_DIGIT,
): string {
  if (!Number.isInteger(serial) || serial < 0) {
    throw new Error("SSCC serial must be a positive integer.");
  }

  if (!/^\d$/.test(extensionDigit)) {
    throw new Error("SSCC extension digit must contain exactly one digit.");
  }

  if (!/^\d+$/.test(companyPrefix)) {
    throw new Error("SSCC company prefix must contain digits only.");
  }

  const serialLength = 17 - extensionDigit.length - companyPrefix.length;

  if (serialLength <= 0) {
    throw new Error("SSCC company prefix is too long.");
  }

  const serialReference = String(serial).padStart(serialLength, "0");

  if (serialReference.length > serialLength) {
    throw new Error("SSCC serial does not fit the configured company prefix.");
  }

  const withoutCheckDigit = `${extensionDigit}${companyPrefix}${serialReference}`;
  return `${withoutCheckDigit}${calculateGS1CheckDigit(withoutCheckDigit)}`;
}

export function formatHumanSSCC(sscc: string): string {
  const digits = sscc.replace(/\D/g, "");

  if (digits.length !== 18) {
    return digits;
  }

  return `${digits.slice(0, 1)} ${digits.slice(1, 8)} ${digits.slice(8, 17)} ${digits.slice(17)}`;
}
