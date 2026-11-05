import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { parsePassportText } from '@/lib/mrz';

type OcrResponse =
  | { ok: true; data: Record<string, string | number> }
  | { ok: false; code: 'OCR_NOT_CONFIGURED' | 'BAD_IMAGE' | 'NO_TEXT' | 'FAILED'; message: string };

// Reads a passport photo with Google Cloud Vision, then extracts fields from the MRZ lines.
export const scanPassport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageBase64: string }) => {
    if (!input || typeof input.imageBase64 !== 'string' || input.imageBase64.length < 100) {
      throw new Error('Missing image');
    }
    if (input.imageBase64.length > 14_000_000) throw new Error('Image is too large (max ~10 MB).');
    return input;
  })
  .handler(async ({ data }): Promise<OcrResponse> => {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        code: 'OCR_NOT_CONFIGURED',
        message: 'Automatic passport reading is not switched on yet. Please type your details below.',
      };
    }
    try {
      const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: data.imageBase64 },
            imageContext: { languageHints: ['en'] },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        responses?: Array<{ fullTextAnnotation?: { text?: string }; error?: { message?: string } }>;
        error?: { message?: string; status?: string };
      };
      if (!res.ok || json.error) {
        console.error('Vision API error', res.status, json.error?.status, json.error?.message);
        const msg = json.error?.message || '';
        if (/API key|billing|disabled|PERMISSION_DENIED/i.test(msg) || res.status === 403 || res.status === 400 && /key/i.test(msg)) {
          return { ok: false, code: 'FAILED', message: 'The passport reader is not set up correctly (Google Vision key or billing). Please type your details below.' };
        }
        return { ok: false, code: 'FAILED', message: 'The passport reader could not process this image. Try a clearer photo or type your details.' };
      }
      const first = json.responses?.[0];
      if (first?.error) {
        console.error('Vision image error', first.error.message);
        return { ok: false, code: 'BAD_IMAGE', message: 'This image could not be read. Try a JPG or PNG photo.' };
      }
      const text = first?.fullTextAnnotation?.text || '';
      if (!text.trim()) {
        return { ok: false, code: 'NO_TEXT', message: 'No text found. Make sure the passport photo page is well lit, flat and in focus.' };
      }
      const parsed = parsePassportText(text);
      delete parsed.raw_text; // never send full passport text back unnecessarily
      return { ok: true, data: parsed as Record<string, string | number> };
    } catch (err) {
      console.error('scanPassport failed', err);
      return { ok: false, code: 'FAILED', message: 'Passport scanning failed. Please try again or type your details.' };
    }
  });
