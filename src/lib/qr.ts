import jsQR from 'jsqr';

type Detector = { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
let nativeDetector: Detector | null | undefined;

function getNativeDetector(): Detector | null {
  if (nativeDetector !== undefined) return nativeDetector;
  try {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    nativeDetector = BD ? new BD({ formats: ['qr_code'] }) : null;
  } catch {
    nativeDetector = null;
  }
  return nativeDetector;
}

let canvas: HTMLCanvasElement | null = null;

/** Decode a QR code from a video frame or image. Uses the fast built-in detector
 *  (Chrome/Android) when present, otherwise jsQR (iOS Safari, Firefox, desktop). */
export async function decodeQrFromSource(source: CanvasImageSource, width: number, height: number): Promise<string | null> {
  const native = getNativeDetector();
  if (native) {
    try {
      const codes = await native.detect(source);
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch {
      /* fall through to jsQR */
    }
  }
  const scale = Math.min(1, 1024 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  canvas = canvas || document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const code = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
  return code?.data || null;
}
