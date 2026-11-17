import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, ChefHat, Clock3, RefreshCw, StickyNote, UtensilsCrossed } from 'lucide-react';
import '../../styles/kitchen.css';
import KitchenSpeakerButton from './KitchenSpeakerButton';

export type KitchenStatus = 'pending' | 'preparing' | 'ready';
export interface KitchenTicketInfo {
  id: number;
  orderNumber: string;
  status: string;
  customerName?: string | null;
  orderType?: string | null;
  source?: string | null;
  tableNumber?: string | null;
  notes?: string | null;
  deliveryAddress?: string | null;
}
export interface KitchenFilter { key: string; label: string; count: number }
interface BoardProps {
  title: string;
  description: string;
  filters: KitchenFilter[];
  selected: string;
  onSelect: (key: string) => void;
  loading: boolean;
  refreshing: boolean;
  updatedAt: Date | null;
  error: string;
  notice: string;
  busy: boolean;
  refresh: () => Promise<void>;
  tools?: ReactNode;
  queueLabel?: string;
  children: ReactNode;
}

export function KitchenBoard({ title, description, filters, selected, onSelect, loading, refreshing, updatedAt, error, notice, busy, refresh, tools, queueLabel = 'Oldest first', children }: BoardProps) {
  const scroller = useRef<HTMLDivElement>(null);
  return <div className="kitchen-station">
    <header className="kitchen-toolbar">
      <div className="kitchen-heading"><div><h1>{title}</h1><p>{description}</p></div>
        <div className="kitchen-tools"><KitchenSpeakerButton />{tools}<button type="button" disabled={refreshing || busy} onClick={() => void refresh()} aria-label="Refresh orders"><RefreshCw size={19} className={refreshing ? 'kitchen-refreshing' : ''} /><span>Refresh</span></button></div>
      </div>
      <div className="kitchen-filters" role="group" aria-label="Order status">
        {filters.map(filter => <button key={filter.key} type="button" aria-pressed={selected === filter.key} className={`kitchen-filter kitchen-filter-${filter.key}`} onClick={() => { onSelect(filter.key); scroller.current?.scrollTo({ top: 0 }); }}><span>{filter.label}</span><strong>{filter.count}</strong></button>)}
      </div>
      <div className="kitchen-sync"><span><span className={`kitchen-live-dot ${error ? 'offline' : ''}`} /><span className="kitchen-sync-message" role="status" aria-live="polite">{error ? 'Refresh needed' : notice || (loading ? 'Connecting…' : 'Live orders')}</span><span className="kitchen-fifo"> · {queueLabel}</span></span><span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Waiting for orders'}</span></div>
    </header>
    {error && <div className="kitchen-error" role="alert"><span>{error}</span><button type="button" disabled={refreshing || busy} onClick={() => void refresh()}>Retry</button></div>}
    <div ref={scroller} className="kitchen-scroll" role="region" aria-label={`${title} tickets`} tabIndex={0}>
      {loading ? <div className="spinner" role="status" aria-label="Loading kitchen orders" /> : children}
    </div>
  </div>;
}

export function KitchenEmpty({ label }: { label: string }) {
  return <div className="kitchen-empty"><UtensilsCrossed size={42} /><h2>{label}</h2><p>New orders appear automatically. You can switch views above.</p></div>;
}

const statusLabels: Record<string, string> = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready' };
export function KitchenTicket({ order, placedAt, children, footer, highlighted = false }: { order: KitchenTicketInfo; placedAt: string; children: ReactNode; footer: ReactNode; highlighted?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60000));
  const wait = Number.isFinite(minutes) ? minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—';
  const StatusIcon = order.status === 'ready' ? CheckCircle2 : order.status === 'preparing' ? ChefHat : Clock3;
  return <article className={`kitchen-ticket kitchen-ticket-${order.status} ${highlighted ? 'kitchen-ticket-selected' : ''}`} aria-label={`Order ${order.orderNumber}`}>
    <div className="kitchen-ticket-header"><div><p>{highlighted ? 'Current order' : 'Order'}</p><h2>#{order.orderNumber}</h2></div><span className={`kitchen-status kitchen-status-${order.status}`}><StatusIcon size={15} />{statusLabels[order.status] || order.status}</span></div>
    <div className="kitchen-ticket-meta"><span><Clock3 size={15} />{wait}</span><span>{order.source === 'online' ? 'Online · ' : ''}{(order.orderType || 'Walk-in').replaceAll('-', ' ')}{order.tableNumber ? ` · Table ${order.tableNumber}` : ''}</span></div>
    <div className="kitchen-ticket-body">
      {order.customerName && <p className="kitchen-customer">{order.customerName}</p>}
      {order.notes && <div className="kitchen-notes"><StickyNote size={17} /><span>{order.notes}</span></div>}
      {order.deliveryAddress && <p className="kitchen-address">Delivery: {order.deliveryAddress}</p>}
      {children}
    </div>
    <div className="kitchen-ticket-footer">{footer}</div>
  </article>;
}
