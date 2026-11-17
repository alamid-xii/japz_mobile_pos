import { useEffect, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { fetchDeliveryProof } from '../services/api';

export default function DeliveryProofPhoto({ proofUrl }: { proofUrl: string }) {
  const [photo, setPhoto] = useState<{ source: string; url: string } | null>(null);
  const [error, setError] = useState<{ source: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let cancelled = false;
    void fetchDeliveryProof(proofUrl, controller.signal).then(response => {
      if (cancelled) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(response.data.type)) throw new Error('Invalid photo response.');
      objectUrl = URL.createObjectURL(response.data);
      setPhoto({ source: proofUrl, url: objectUrl });
    }).catch(() => { if (!cancelled) setError({ source: proofUrl, message: 'Could not load the proof photo. Please sign in with the account allowed to view this delivery.' }); });
    return () => { cancelled = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [proofUrl, attempt]);
  if (error?.source === proofUrl) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><p>{error.message}</p><button type="button" className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold" onClick={() => { setError(null); setPhoto(null); setAttempt(value => value + 1); }}><RefreshCw size={16} />Try again</button></div>;
  if (photo?.source === proofUrl) return <img src={photo.url} alt="Proof of delivery" className="w-full rounded-xl border border-gray-200" />;
  return <p role="status" className="flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-slate-600"><Camera size={18} />Loading proof photo…</p>;
}
