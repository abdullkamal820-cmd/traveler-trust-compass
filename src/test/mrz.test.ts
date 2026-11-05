import { describe, expect, it } from 'vitest';
import { parsePassportText } from '@/lib/mrz';

// ICAO 9303 specimen passport
const SPECIMEN = `PASSPORT
Surname ERIKSSON
P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

describe('passport MRZ parsing', () => {
  it('extracts name, number, nationality and dates from the MRZ', () => {
    const r = parsePassportText(SPECIMEN);
    expect(r.full_name).toBe('ANNA MARIA ERIKSSON');
    expect(r.passport_number).toBe('L898902C3');
    expect(r.nationality).toBe('UTO');
    expect(r.date_of_birth).toBe('1974-08-12');
    expect(r.expiry_date).toBe('2012-04-15');
    expect(r.gender).toBe('F');
  });

  it('reports high confidence only when all check digits pass', () => {
    expect(parsePassportText(SPECIMEN).confidence).toBe(0.95);
    const broken = SPECIMEN.replace('L898902C36', 'L898902C35');
    expect(parsePassportText(broken).confidence).toBe(0.8);
  });

  it('tolerates OCR spaces inside MRZ lines', () => {
    const spaced = SPECIMEN.replace('P<UTOERIKSSON', 'P<UTO ERIKSSON');
    expect(parsePassportText(spaced).passport_number).toBe('L898902C3');
  });
});
