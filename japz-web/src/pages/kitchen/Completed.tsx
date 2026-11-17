import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, RefreshCw, Search, X } from 'lucide-react';
import Modal from '../../components/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useKitchenFeed } from '../../hooks/useKitchenFeed';
import { usePagination } from '../../features/inventory/pagination';
import { ordersAPI } from '../../services/api';
import { modifierText } from '../../utils/kitchen';
import '../../styles/completed-orders.css';

interface CompletedOrder {
  id: number; orderNumber: string; status: string; createdAt: string; completedAt?: string | null;
  customerName?: string; orderType?: string; tableNumber?: string; deliveryAddress?: string; notes?: string;
  items?: { id?: number; name: string; quantity: number; modifiers?: Record<string, unknown> | null }[];
}
const clock = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const duration = (order: CompletedOrder) => {
  const elapsed = order.completedAt ? Date.parse(order.completedAt) - Date.parse(order.createdAt) : NaN;
  if (!Number.isFinite(elapsed) || elapsed < 0) return '—';
  const minutes = Math.floor(elapsed / 60000);
  return minutes < 1 ? `${Math.floor(elapsed / 1000)}s` : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
export default function KitchenCompleted() {
  const { user } = useAuth();
  const load = useCallback(async () => (await ordersAPI.getCompletedByCategories({ assignedCategories: user?.assignedCategories || [] })).data.orders as CompletedOrder[], [user?.assignedCategories]);
  const feed = useKitchenFeed(load, 10000);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState(10);
  const [detailId, setDetailId] = useState<number | null>(null);
  const normalized = query.trim().toLowerCase();
  const sorted = [...feed.orders].filter(order => `${order.orderNumber} ${order.customerName || ''} ${order.orderType || ''} ${order.tableNumber || ''} ${(order.items || []).map(item => item.name).join(' ')}`.toLowerCase().includes(normalized)).sort((a, b) => (Date.parse(b.completedAt || b.createdAt) - Date.parse(a.completedAt || a.createdAt)) || b.id - a.id);
  const pagination = usePagination(sorted, `${normalized}:${size}`, size);
  const detail = feed.orders.find(order => order.id === detailId);
  const first = pagination.total ? (pagination.current - 1) * size + 1 : 0;
  const last = Math.min(pagination.current * size, pagination.total);

  return <div className="completed-page">
    <header className="completed-header"><div><h1>Completed Orders</h1><p>Orders completed today · {feed.orders.length} total</p></div><button type="button" className="completed-refresh" disabled={feed.refreshing} onClick={() => void feed.refresh()}><RefreshCw size={18} />{feed.refreshing ? 'Refreshing…' : 'Refresh'}</button></header>
    <div className="completed-search"><Search size={18} /><input type="search" aria-label="Search completed orders" placeholder="Search order, customer, table or item" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear order search" onClick={() => setQuery('')}><X size={18} /></button>}</div>
    {feed.error && <div className="completed-error" role="alert">{feed.error}<button type="button" disabled={feed.refreshing} onClick={() => void feed.refresh()}>Retry</button></div>}
    <div className="completed-table-scroll" role="region" aria-label="Completed orders table" tabIndex={0}>
      <table className="completed-table"><caption className="sr-only">Completed orders today, newest first</caption><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Type / table</th><th scope="col">Items</th><th scope="col">Completed</th><th scope="col">Duration</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
        <tbody>{feed.loading ? <tr><td colSpan={7}><div className="spinner" role="status" aria-label="Loading completed orders" /></td></tr> : pagination.rows.length ? pagination.rows.map(order => <tr key={order.id}>
          <th scope="row">#{order.orderNumber}</th><td>{order.customerName || 'Walk-in'}</td><td><span className="completed-type">{(order.orderType || 'Walk-in').replaceAll('-', ' ')}</span>{order.tableNumber && <small>Table {order.tableNumber}</small>}</td><td>{(order.items || []).reduce((sum, item) => sum + item.quantity, 0)}</td><td>{clock(order.completedAt)}</td><td>{duration(order)}</td><td><button type="button" className="completed-view" aria-label={`View order ${order.orderNumber}`} onClick={() => setDetailId(order.id)}><Eye size={18} /><span>View</span></button></td>
        </tr>) : <tr><td colSpan={7}><div className="completed-empty"><strong>{query ? 'No matching completed orders' : 'No completed orders today'}</strong><p>{query ? 'Try another order number, customer or item.' : 'Completed orders will appear here.'}</p></div></td></tr>}</tbody>
      </table>
    </div>
    <footer className="completed-pagination" aria-label="Completed order pagination"><div className="completed-range" role="status">{first}–{last} of {pagination.total}</div><label className="completed-size">Rows<select aria-label="Rows per page" value={size} onChange={event => setSize(Number(event.target.value))}>{[10, 25, 50].map(value => <option value={value} key={value}>{value}</option>)}</select></label><div className="completed-page-controls"><button type="button" className="completed-edge" aria-label="First page" disabled={pagination.current === 1} onClick={() => pagination.setPage(1)}><ChevronsLeft size={19} /></button><button type="button" aria-label="Previous page" disabled={pagination.current === 1} onClick={() => pagination.setPage(pagination.current - 1)}><ChevronLeft size={19} /></button><span>Page <strong>{pagination.current}</strong> of {pagination.pages}</span><button type="button" aria-label="Next page" disabled={pagination.current === pagination.pages} onClick={() => pagination.setPage(pagination.current + 1)}><ChevronRight size={19} /></button><button type="button" className="completed-edge" aria-label="Last page" disabled={pagination.current === pagination.pages} onClick={() => pagination.setPage(pagination.pages)}><ChevronsRight size={19} /></button></div></footer>
    {detail && <Modal label={`Order ${detail.orderNumber} details`} onClose={() => setDetailId(null)} className="completed-details"><header><div><p>Completed order</p><h2>#{detail.orderNumber}</h2></div><button type="button" aria-label="Close order details" onClick={() => setDetailId(null)}><X size={20} /></button></header><dl><div><dt>Customer</dt><dd>{detail.customerName || 'Walk-in'}</dd></div><div><dt>Order type</dt><dd>{(detail.orderType || 'Walk-in').replaceAll('-', ' ')}{detail.tableNumber ? ` · Table ${detail.tableNumber}` : ''}</dd></div><div><dt>Ordered</dt><dd>{clock(detail.createdAt)}</dd></div><div><dt>Completed</dt><dd>{clock(detail.completedAt)}</dd></div><div><dt>Duration</dt><dd>{duration(detail)}</dd></div></dl>{detail.deliveryAddress && <p className="completed-note">Delivery: {detail.deliveryAddress}</p>}{detail.notes && <p className="completed-note">Notes: {detail.notes}</p>}<h3>Order items</h3><ul>{detail.items?.map((item, index) => <li key={item.id || index}><strong>{item.quantity}× {item.name}</strong>{modifierText(item.modifiers) && <p>{modifierText(item.modifiers)}</p>}</li>)}</ul></Modal>}
  </div>;
}