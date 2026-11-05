// MRZ passport parser, ported from the original ocr-passport function.
const MRZ_CHARS = /^[A-Z0-9<]+$/;

function normalizeMrzLine(line: string): string {
  return line.toUpperCase().replace(/[^A-Z0-9<]/g, "");
}

function findMrzPair(text: string): [string, string] | null {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((l) => l.length >= 30 && MRZ_CHARS.test(l));

  for (let i = 0; i < lines.length - 1; i++) {
    const first = lines[i];
    const second = lines[i + 1];
    if (first.startsWith("P") && second.length >= 40) {
      return [first.padEnd(44, "<").slice(0, 44), second.padEnd(44, "<").slice(0, 44)];
    }
  }

  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].length >= 40 && lines[i + 1].length >= 40) {
      return [lines[i].padEnd(44, "<").slice(0, 44), lines[i + 1].padEnd(44, "<").slice(0, 44)];
    }
  }
  return null;
}

function checkDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    let value: number;
    if (c === "<") value = 0;
    else if (c >= "0" && c <= "9") value = c.charCodeAt(0) - 48;
    else value = c.charCodeAt(0) - 55;
    sum += value * weights[i % 3];
  }
  return sum % 10;
}

function checkOk(field: string, digit: string): boolean {
  return /^\d$/.test(digit) && checkDigit(field) === parseInt(digit, 10);
}

export function parsePassportText(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const pair = findMrzPair(text);

  if (pair) {
    const [line1, line2] = pair;

    const documentType = line1[0] === "P" ? "passport" : "other";
    const issuingCountry = line1.substring(2, 5).replace(/</g, "");
    const names = line1.substring(5).split("<<");
    const surname = names[0].replace(/</g, " ").trim();
    const givenNames = (names[1] || "").replace(/</g, " ").trim();

    const passportNumberRaw = line2.substring(0, 9);
    const passportNumberCheck = line2[9];
    const nationality = line2.substring(10, 13).replace(/</g, "");
    const birthRaw = line2.substring(13, 19);
    const birthCheck = line2[19];
    const sex = line2[20];
    const expiryRaw = line2.substring(21, 27);
    const expiryCheck = line2[27];

    result.document_type = documentType;
    result.passport_type = "P";
    result.issuing_country = issuingCountry;
    result.nationality = nationality;
    result.full_name = [givenNames, surname].filter(Boolean).join(" ");
    result.passport_number = passportNumberRaw.replace(/</g, "");
    result.gender = sex === "M" || sex === "F" ? sex : "";

    if (/^\d{6}$/.test(birthRaw)) result.date_of_birth = formatMrzDate(birthRaw, false);
    if (/^\d{6}$/.test(expiryRaw)) result.expiry_date = formatMrzDate(expiryRaw, true);

    const checks = [
      checkOk(passportNumberRaw, passportNumberCheck),
      checkOk(birthRaw, birthCheck),
      checkOk(expiryRaw, expiryCheck),
    ];
    result.mrz_checks_passed = checks.filter(Boolean).length;
    result.confidence = checks.every(Boolean) ? 0.95 : checks.filter(Boolean).length >= 2 ? 0.8 : 0.5;
  } else {
    result.confidence = 0.2;
  }

  if (!result.full_name) {
    const nameMatch = text.match(/(?:Surname|Name|Nom)[:\s]+([A-Za-z][A-Za-z\s'-]{1,60})/i);
    if (nameMatch) result.full_name = nameMatch[1].trim();
  }
  if (!result.passport_number) {
    const numMatch = text.match(/(?:Passport\s*(?:No|Number)|Passeport)[.:\s]*([A-Z0-9]{6,9})/i);
    if (numMatch) result.passport_number = numMatch[1].toUpperCase();
  }

  result.raw_text = text;
  return result;
}

function formatMrzDate(yyMMdd: string, isExpiry: boolean): string {
  const yy = parseInt(yyMMdd.substring(0, 2), 10);
  const mm = yyMMdd.substring(2, 4);
  const dd = yyMMdd.substring(4, 6);
  const nowYY = new Date().getFullYear() % 100;
  const year = isExpiry ? 2000 + yy : yy > nowYY ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}
