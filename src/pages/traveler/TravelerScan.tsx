import { useState, useRef } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { ScanLine, Upload, FileText, CheckCircle2, AlertCircle, Save, RotateCcw, Camera, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Spinner, Toast } from '@/components/ui';
import type { OCRResult } from '@/types';
import { useServerFn } from '@tanstack/react-start';
import { scanPassport } from '@/lib/ocr.functions';
import { compressImage } from '@/lib/image';

export function TravelerScan() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const scanPassportFn = useServerFn(scanPassport);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'saved'>('upload');
  const [ocrData, setOcrData] = useState<OCRResult>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      setError('Please choose a photo (JPG or PNG) of your passport page.');
      setOcrData({});
      setStep('review');
      return;
    }
    setStep('processing');
    try {
      const { dataUrl, base64 } = await compressImage(file);
      setImagePreview(dataUrl);
      const result = await scanPassportFn({ data: { imageBase64: base64 } });
      if (!result.ok) {
        setError(result.message);
        setOcrData({});
      } else {
        setOcrData(result.data as OCRResult);
        const filled = ['full_name', 'passport_number', 'nationality', 'date_of_birth'].filter((k) => (result.data as Record<string, unknown>)[k]);
        if (filled.length < 2) setError('We could only read part of the passport. Please check and fill in the missing fields.');
      }
    } catch (e) {
      console.error(e);
      setError('Could not scan this photo. Please try again or type your details below.');
      setOcrData({});
    }
    setStep('review');
  };

  const startManual = () => {
    setError(null);
    setImagePreview('');
    setOcrData({ full_name: profile?.full_name || '' });
    setStep('review');
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!ocrData.full_name?.trim() || !ocrData.passport_number?.trim() || !ocrData.nationality?.trim()) {
      setError('Full name, passport number and nationality are required.');
      return;
    }
    setSaving(true);
    setError(null);

    const existing = await supabase.from('identities').select('id').eq('user_id', profile.id).maybeSingle();
    if (existing.data) {
      setError('You already have an identity card. Please edit it from the Identity page instead of creating a new one.');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('identities')
      .insert({
        user_id: profile.id,
        full_name: ocrData.full_name || profile.full_name,
        nationality: ocrData.nationality || '',
        passport_number: ocrData.passport_number || '',
        passport_type: ocrData.passport_type || null,
        date_of_birth: ocrData.date_of_birth || null,
        gender: ocrData.gender || null,
        place_of_birth: ocrData.place_of_birth || null,
        issue_date: ocrData.issue_date || null,
        expiry_date: ocrData.expiry_date || null,
        issuing_country: ocrData.issuing_country || null,
        document_type: ocrData.document_type || 'passport',
      })
      .select()
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setToast({ message: 'Digital identity created successfully!', type: 'success' });
    setSaving(false);
    setStep('saved');
    setTimeout(() => navigate('/traveler/identity'), 1500);
  };

  const reset = () => {
    setStep('upload');
    setOcrData({});
    setImagePreview('');
    setError(null);
  };

  const fields: { key: keyof OCRResult; label: string; type?: string }[] = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'passport_number', label: 'Passport Number' },
    { key: 'passport_type', label: 'Passport Type' },
    { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    { key: 'gender', label: 'Gender' },
    { key: 'place_of_birth', label: 'Place of Birth' },
    { key: 'issue_date', label: 'Issue Date', type: 'date' },
    { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { key: 'issuing_country', label: 'Issuing Country' },
  ];

  return (
    <DashboardLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Scan Passport</h1>
        <p className="text-navy-500 mt-1">Upload a photo of your passport to extract information automatically</p>
      </div>

      <div className="max-w-3xl mx-auto">
        {step === 'upload' && (
          <Card className="animate-fade-in">
            <div
              className="border-2 border-dashed border-navy-200 rounded-2xl p-12 text-center hover:border-turquoise-400 hover:bg-turquoise-50/30 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-turquoise-500 to-turquoise-700 flex items-center justify-center mx-auto mb-6">
                <ScanLine size={36} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Upload your passport photo</h3>
              <p className="text-navy-500 mt-2 max-w-md mx-auto">
                Drag and drop a clear photo of your passport's data page, or click to browse. The photo page with your photo and MRZ text works best.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="btn-primary">
                  <Upload size={18} />
                  Choose File
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} className="btn-secondary">
                  <Camera size={18} />
                  Take Photo
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f); }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f); }}
              />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-navy-50 border border-navy-100">
              <p className="text-sm text-navy-600 flex items-start gap-2">
                <Info size={16} className="text-turquoise-600 flex-shrink-0 mt-0.5" />
                Tip: lay the passport flat in good light so the two lines of code at the bottom are sharp.
              </p>
              <button type="button" onClick={startManual} className="text-sm font-semibold text-turquoise-700 hover:text-turquoise-800 whitespace-nowrap">
                Enter details manually
              </button>
            </div>
          </Card>
        )}

        {step === 'processing' && (
          <Card className="animate-fade-in">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-turquoise-500 to-turquoise-700 flex items-center justify-center mb-6">
                <Loader2 size={36} className="text-white animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Scanning your passport...</h3>
              <p className="text-navy-500 mt-2">Extracting text using OCR technology</p>
              {imagePreview && (
                <img src={imagePreview} alt="Passport" className="mt-6 max-h-48 rounded-xl border border-navy-200" />
              )}
            </div>
          </Card>
        )}

        {step === 'review' && (
          <Card className="animate-fade-in">
            <div className="flex items-start gap-3 mb-6">
              {error ? (
                <AlertCircle size={20} className="text-accent-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={20} className="text-turquoise-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-lg font-bold text-navy-900">
                  {error ? 'Please check your details' : imagePreview ? 'Review Extracted Information' : 'Enter your passport details'}
                </h3>
                <p className="text-sm text-navy-500 mt-1">
                  {error ? error : imagePreview ? 'Please review the extracted data and correct any errors before saving.' : 'Type the details exactly as they appear on your passport.'}
                </p>
              </div>
            </div>

            {imagePreview && (
              <div className="mb-6 flex justify-center">
                <img src={imagePreview} alt="Passport" className="max-h-48 rounded-xl border border-navy-200" />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    className="input"
                    value={(ocrData[field.key] as string) || ''}
                    onChange={(e) => setOcrData({ ...ocrData, [field.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button onClick={reset} className="btn-secondary">
                <RotateCcw size={16} />
                Start over
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <Spinner size={16} /> : <Save size={16} />}
                Save Identity
              </button>
            </div>
          </Card>
        )}

        {step === 'saved' && (
          <Card className="animate-scale-in">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-turquoise-100 flex items-center justify-center mb-6">
                <CheckCircle2 size={36} className="text-turquoise-600" />
              </div>
              <h3 className="text-xl font-bold text-navy-900">Identity Created!</h3>
              <p className="text-navy-500 mt-2">Redirecting to your identity card...</p>
              <Link to="/traveler/identity" className="btn-secondary mt-6">
                <FileText size={16} />
                View Identity Card
              </Link>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
