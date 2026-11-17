import { useEffect, useState } from 'react';
import { Bike, ExternalLink, MapPin } from 'lucide-react';
import { isFreshRiderLocation } from '../../../../types/delivery';
import { googleMapsSearchUrl } from '../../../../utils/googleMaps';
import DeliveryMap from './DeliveryMap';
import type { DeliveryInfo } from './DeliveryEta';

export default function LiveDeliveryTracking({ info, status, connected }: { info: DeliveryInfo; status: string; connected: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const travelling = status === 'out-for-delivery';
  const location = info.location;
  const live = travelling && connected && isFreshRiderLocation(location, now);
  const description = status === 'completed' ? 'Delivery complete. Live location sharing has ended.'
    : !travelling ? 'Your rider’s location appears after dispatch, once they start sharing.'
    : !connected ? 'Connection interrupted. Reconnecting to location updates…'
    : location?.status === 'stale' || (location?.status === 'live' && !live) ? 'The last GPS update is old. Waiting for a fresh rider location.'
    : live ? 'The map follows the latest location shared by your rider.'
    : 'Your rider is not sharing a location yet. Delivery status still updates automatically.';
  return <>
    {info.lat != null && info.lng != null ? <DeliveryMap lat={info.lat} lng={info.lng} storeLat={live ? location!.lat : info.storeLat} storeLng={live ? location!.lng : info.storeLng} originLabel={live ? info.riderName || 'Your rider' : 'JAPZ Grill'} originKind={live ? 'rider' : 'store'} liveOrigin={live} label={info.address || undefined} /> : <section aria-label="Delivery map" className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-slate-600"><p>This delivery address does not have a saved map pin yet.</p>{info.address && <a href={`https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: info.address })}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold underline"><MapPin size={16} />Find delivery address in Google Maps<ExternalLink size={12} /></a>}</section>}
    <section aria-label="Live rider tracking" className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Bike size={19} />Live rider location</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${live ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-slate-600'}`}>{live ? 'Live' : travelling ? 'Waiting for GPS' : status === 'completed' ? 'Ended' : 'Not dispatched'}</span></div>
      <p role="status" className="mt-2 text-xs text-slate-600">{description}</p>
      {live && location && <div className="mt-2 space-y-1 text-xs text-slate-500"><p>Updated {new Date(location.capturedAt!).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' })} PH{location.accuracy != null ? ` · GPS accuracy ±${Math.round(location.accuracy)} m` : ''}</p><a href={googleMapsSearchUrl(location.lat!, location.lng!)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-bold underline underline-offset-4"><MapPin size={15} />View rider in Google Maps<ExternalLink size={12} /></a></div>}
    </section>
  </>;
}
