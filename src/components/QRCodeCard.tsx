import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';

export function QRCodeCard({ token, size = 200 }: { token: string; size?: number }) {
  const [src, setSrc] = useState<string>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc('');
    setFailed(false);
    QRCode.toDataURL(token, {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#102a43', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [token, size]);

  const handleDownload = () => {
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `identity-qr-${token.slice(0, 8)}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center">
      {failed ? (
        <div style={{ width: size, height: size }} className="rounded-2xl bg-white flex flex-col items-center justify-center gap-2 text-center p-4">
          <AlertCircle size={24} className="text-red-500" />
          <p className="text-sm text-navy-700 font-medium">Could not generate QR code</p>
        </div>
      ) : src ? (
        <div className="p-3 bg-white rounded-2xl border border-navy-100 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
          <img src={src} alt="QR Code" width={size} height={size} className="rounded-lg" />
        </div>
      ) : (
        <div style={{ width: size, height: size }} className="rounded-2xl shimmer-bg" />
      )}
      <p className="text-xs text-navy-400 mt-3 font-mono break-all max-w-[200px] text-center">{token}</p>
      {src && (
        <button onClick={handleDownload} className="btn-secondary mt-4 text-sm py-2">
          <Download size={14} />
          Download QR
        </button>
      )}
    </div>
  );
}
