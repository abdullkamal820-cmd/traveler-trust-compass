import { useState, useRef, useEffect } from 'react';
import { ScanLine, ShieldCheck, AlertTriangle, User2, FileText, Calendar, Globe2, Camera, RotateCcw, Search, Flag, Loader2, CheckCircle2, XCircle, AlertCircle, Building2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Spinner, StatusBadge, Toast, Modal, EmptyState } from '@/components/ui';
import type { Identity, Profile, Business } from '@/types';
import { decodeQrFromSource } from '@/lib/qr';

type ScanResult = {
  status: 'idle' | 'scanning' | 'found' | 'not_found' | 'error';
  identity?: Identity;
  traveler?: Profile;
  matchedFields?: Record<string, boolean>;
  verificationId?: string;
};

export function BusinessScan() {
  const { profile } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle' });
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const scanningLoopRef = useRef(false);
  const qrPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from('businesses').select('*').eq('user_id', profile.id).maybeSingle().then(({ data }) => {
      setBusiness(data as Business | null);
      setLoading(false);
    });
    return () => stopCamera();
  }, [profile]);

  const stopCamera = () => {
    scanningLoopRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast({ message: 'This browser cannot open the camera here. Use "Scan from photo" or type the code.', type: 'error' });
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCameraActive(true);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true'); // iOS Safari
        video.muted = true;
        await video.play().catch(() => undefined);
      }
      scanningLoopRef.current = true;
      scanLoop();
    } catch (err) {
      const name = (err as DOMException)?.name;
      setToast({
        message: name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, or use "Scan from photo".'
          : 'Could not open the camera. Use "Scan from photo" or type the code below.',
        type: 'error',
      });
      stopCamera();
    }
  };

  const scanLoop = async () => {
    if (!scanningLoopRef.current) return;
    const token = await scanVideoFrame();
    if (token) {
      stopCamera();
      handleTokenLookup(token);
      return;
    }
    scanIntervalRef.current = window.setTimeout(scanLoop, 250);
  };

  const scanVideoFrame = async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState < 2 || !video.videoWidth) return null;
    return decodeQrFromSource(video, video.videoWidth, video.videoHeight);
  };

  const handleQrPhoto = async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const token = await decodeQrFromSource(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
      if (token) handleTokenLookup(token);
      else setToast({ message: 'No QR code found in that photo. Try again closer and in focus.', type: 'error' });
    } catch {
      setToast({ message: 'Could not read that photo.', type: 'error' });
    }
  };

  const handleTokenLookup = async (token: string) => {
    if (!token.trim() || !business) return;
    setScanning(true);
    setScanResult({ status: 'scanning' });

    const { data, error } = await supabase.rpc('verify_traveler_qr', { _token: token.trim() });
    setScanning(false);
    if (error) {
      setScanResult({ status: 'idle' });
      setToast({ message: error.message, type: 'error' });
      return;
    }
    const res = data as unknown as { status: string; verification_id?: string; identity?: Identity; traveler?: Profile };
    if (res.status !== 'found' || !res.identity) {
      setScanResult({ status: 'not_found' });
      return;
    }
    const matchedFields: Record<string, boolean> = { full_name: true, nationality: true, passport_number: true, date_of_birth: true };
    setScanResult({ status: 'found', identity: res.identity, traveler: res.traveler, matchedFields, verificationId: res.verification_id });
    setToast({ message: 'Identity found — compare it with the physical passport', type: 'success' });
  };

  const handleManualLookup = () => {
    if (tokenInput.trim()) {
      handleTokenLookup(tokenInput.trim());
    }
  };

  const handleReportMismatch = async () => {
    if (!business || !scanResult.identity || !scanResult.traveler) return;
    setReporting(true);
    const { error } = await supabase.from('mismatch_reports').insert({
      business_id: business.id,
      traveler_user_id: scanResult.traveler.id,
      identity_id: scanResult.identity.id,
      verification_id: scanResult.verificationId ?? null,
      report_reason: reportReason,
      details: reportDetails,
      status: 'open',
    });

    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Mismatch report submitted', type: 'success' });
      setReportModalOpen(false);
      setReportReason('');
      setReportDetails('');
    }
    setReporting(false);
  };

  const reset = () => {
    setScanResult({ status: 'idle' });
    setTokenInput('');
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><Spinner size={32} /></div></DashboardLayout>;

  if (!business) {
    return (
      <DashboardLayout>
        <Card><EmptyState icon={Building2} title="Business profile required" description="Set up your business profile first to start scanning." /></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Scan & Verify</h1>
        <p className="text-navy-500 mt-1">Scan a traveler's QR code to verify their digital identity</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {scanResult.status === 'idle' && (
          <div className="space-y-6 animate-fade-in">
            {/* Camera scanner */}
            <Card>
              <h2 className="text-lg font-bold text-navy-900 mb-4">Camera Scanner</h2>
              <div className="relative bg-navy-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraActive ? '' : 'hidden'}`}
                  playsInline
                  muted
                  autoPlay
                />
                {cameraActive ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-turquoise-400 rounded-2xl shadow-[0_0_0_9999px_rgba(10,28,46,0.45)]">
                        <div className="w-full h-full border-4 border-transparent border-t-turquoise-400 animate-pulse rounded-2xl" />
                      </div>
                    </div>
                    <button type="button" onClick={stopCamera} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/20 text-white rounded-xl text-sm backdrop-blur-md hover:bg-white/30">
                      Stop Camera
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={startCamera} className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white p-8">
                    <div className="w-16 h-16 rounded-2xl bg-turquoise-500/20 flex items-center justify-center">
                      <Camera size={28} className="text-turquoise-400" />
                    </div>
                    <p className="font-medium">Start Camera to Scan QR Code</p>
                    <p className="text-sm text-navy-300">Point your camera at a traveler's identity QR code</p>
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center justify-center">
                <button type="button" onClick={() => qrPhotoRef.current?.click()} className="btn-secondary text-sm">
                  <ImageIcon size={16} />
                  Scan from photo
                </button>
                <input
                  ref={qrPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleQrPhoto(f); }}
                />
              </div>
            </Card>

            {/* Manual entry */}
            <Card>
              <h2 className="text-lg font-bold text-navy-900 mb-4">Manual Token Entry</h2>
              <p className="text-sm text-navy-400 mb-4">If the camera isn't available, type the code shown under the traveler's QR:</p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    className="input pl-11 font-mono"
                    placeholder="Enter QR token..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  />
                </div>
                <button onClick={handleManualLookup} disabled={!tokenInput.trim()} className="btn-primary">
                  <ScanLine size={16} />
                  Verify
                </button>
              </div>
            </Card>
          </div>
        )}

        {scanResult.status === 'scanning' && (
          <Card className="animate-fade-in">
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={40} className="text-turquoise-600 animate-spin mb-4" />
              <p className="text-navy-600 font-medium">Looking up identity...</p>
            </div>
          </Card>
        )}

        {scanResult.status === 'not_found' && (
          <Card className="animate-scale-in">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <XCircle size={36} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-navy-900">Identity Not Found</h3>
              <p className="text-navy-500 mt-2 max-w-md">No digital identity matches this QR token. The token may be invalid or the identity may have been removed.</p>
              <button onClick={reset} className="btn-secondary mt-6">
                <RotateCcw size={16} />
                Try Again
              </button>
            </div>
          </Card>
        )}

        {scanResult.status === 'found' && scanResult.identity && (
          <div className="space-y-6 animate-scale-in">
            {/* Result banner */}
            <div className={`p-5 rounded-2xl flex items-center gap-4 ${
              scanResult.status === 'found' ? 'bg-turquoise-50 border border-turquoise-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                scanResult.status === 'found' ? 'bg-turquoise-500' : 'bg-red-500'
              }`}>
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-navy-900 text-lg">Identity Verified</p>
                <p className="text-sm text-navy-600">All fields match. This traveler's identity is confirmed.</p>
              </div>
            </div>

            {/* Traveler info */}
            <Card>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-navy-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center text-white text-xl font-bold">
                  {scanResult.identity.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900">{scanResult.identity.full_name}</h3>
                  <p className="text-sm text-navy-400">{scanResult.traveler?.role === 'traveler' ? 'Verified Traveler' : 'User'}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={scanResult.identity.status} />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">Identity Details</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', value: scanResult.identity.full_name, icon: User2 },
                  { label: 'Nationality', value: scanResult.identity.nationality, icon: Globe2 },
                  { label: 'Passport Number', value: scanResult.identity.passport_number, icon: FileText },
                  { label: 'Date of Birth', value: scanResult.identity.date_of_birth || '—', icon: Calendar },
                  { label: 'Expiry Date', value: scanResult.identity.expiry_date || '—', icon: Calendar },
                  { label: 'Issuing Country', value: scanResult.identity.issuing_country || '—', icon: Globe2 },
                ].map((field) => (
                  <div key={field.label} className="flex items-start gap-3 p-3 rounded-xl bg-navy-50">
                    <field.icon size={16} className="text-navy-400 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-navy-400">{field.label}</p>
                      <p className="text-sm font-medium text-navy-900 truncate">{field.value}</p>
                    </div>
                    <CheckCircle2 size={14} className="text-turquoise-500 ml-auto mt-1" />
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-navy-100">
                <button onClick={reset} className="btn-secondary flex-1">
                  <ScanLine size={16} />
                  Scan Another
                </button>
                <button onClick={() => setReportModalOpen(true)} className="btn-danger flex-1">
                  <Flag size={16} />
                  Report Mismatch
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Report Mismatch Modal */}
      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Report Identity Mismatch" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-accent-50 border border-accent-200 flex items-start gap-2">
            <AlertCircle size={16} className="text-accent-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent-700">Report a mismatch if the traveler's physical identity doesn't match the digital record. This will be reviewed by platform admins.</p>
          </div>
          <div>
            <label className="label">Reason</label>
            <select className="input" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              <option value="">Select a reason...</option>
              <option value="Name mismatch">Name doesn't match</option>
              <option value="Passport number mismatch">Passport number doesn't match</option>
              <option value="Photo mismatch">Photo doesn't match</option>
              <option value="Expired document">Document appears expired</option>
              <option value="Suspicious document">Document appears tampered</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Additional Details</label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="Describe what doesn't match..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setReportModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReportMismatch} disabled={!reportReason || reporting} className="btn-danger">
              {reporting ? <Spinner size={16} /> : <Flag size={16} />}
              Submit Report
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}


