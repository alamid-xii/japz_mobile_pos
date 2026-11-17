import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import rider from '../assets/rider.svg?raw';
import { introPlayedKey } from '../utils/orderingSession';
import '../styles/ordering-intro.css';

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe = (listener: () => void) => { motion.addEventListener('change', listener); return () => motion.removeEventListener('change', listener); };

interface Props {
  onEnter: () => void;
  trackPath: string;
  shopOpen: boolean;
  openingTime?: string;
  loading: boolean;
  statusError: string | null;
}
const openingLabel = (value?: string) => {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) return '';
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function OrderingIntro({ onEnter, trackPath, shopOpen, openingTime, loading, statusError }: Props) {
  const reduce = useSyncExternalStore(subscribe, () => motion.matches);
  const [done, setDone] = useState(() => { try { return sessionStorage.getItem(introPlayedKey) === 'yes'; } catch { return false; } });
  const complete = done || reduce;
  useEffect(() => {
    try { sessionStorage.setItem(introPlayedKey, 'yes'); } catch { /* Session memory is optional. */ }
    const timer = window.setTimeout(() => setDone(true), 3600);
    return () => window.clearTimeout(timer);
  }, []);
  const opens = openingLabel(openingTime);
  const status = loading ? 'Checking store hours…' : statusError ? 'Store status unavailable' : shopOpen ? 'Open now' : opens ? `Closed · Opens at ${opens}` : 'Closed';
  return <main className={`ordering-intro ${complete ? 'intro-complete' : 'intro-playing'}`} aria-label="Welcome to JAPZ GRILL">
    <div className="intro-content">
      <div className="intro-logo-card"><img src="/logo.jpg" alt="JAPZ GRILL — Burger & Bistro" width="200" height="200" /></div>
      <h1>Made fresh. Delivered happy.</h1>
      <p className="intro-subline">Your favorites are one tap away.</p>
      <div className="intro-rider-wrap">
        <div className="rider-scene" aria-hidden="true" dangerouslySetInnerHTML={{ __html:rider }} />
      </div>
      <div className="intro-action" aria-hidden={!complete}>
        <button type="button" className="intro-order-button" disabled={!complete} tabIndex={complete ? 0 : -1} onClick={onEnter}>Get Started<ArrowRight size={19} aria-hidden="true" /></button>
        <Link className="intro-track" to={trackPath} tabIndex={complete ? 0 : -1}>Track my order</Link>
      </div>
      <p className={`intro-store-status ${!loading && !statusError && shopOpen ? 'is-open' : ''}`} role="status"><span aria-hidden="true" />{status}</p>
    </div>
  </main>;
}
