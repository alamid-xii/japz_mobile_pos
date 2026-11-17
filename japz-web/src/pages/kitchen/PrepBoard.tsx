import { useState } from 'react';
import { Check, CheckCircle2, Play, RotateCcw, Send } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KitchenBoard, KitchenEmpty, KitchenTicket, type KitchenStatus, type KitchenTicketInfo } from '../../components/kitchen/KitchenBoard';
import { modifierText } from '../../utils/kitchen';
import { useKitchenFeed } from '../../hooks/useKitchenFeed';
import { ordersAPI, workflowAPI } from '../../services/api';

interface PrepItem {
  id: number;
  name: string;
  quantity: number;
  modifiers: Record<string, unknown> | null;
  status: KitchenStatus;
}
interface PrepOrder extends KitchenTicketInfo {
  placedAt: string;
  allReady: boolean;
  items: PrepItem[];
}
const loadOrders = async () => (await workflowAPI.kitchenOrders()).data.orders as PrepOrder[];

export default function PrepBoard() {
  const feed = useKitchenFeed(loadOrders, 4000);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const target = Number(params.get('order')) || null;
  const [filter, setFilter] = useState('all');
  const sorted = [...feed.orders].sort((a, b) => Number(b.id === target) - Number(a.id === target) || new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime() || a.id - b.id);
  const missingTarget = Boolean(target && !sorted.some(order => order.id === target));
  const visible = missingTarget ? [] : sorted.filter(order => filter === 'all' || (filter === 'ready' ? order.allReady : !order.allReady && order.items.some(item => item.status === 'preparing' || item.status === 'ready')));
  const filters = [
    { key: 'all', label: 'All tickets', count: sorted.length },
    { key: 'preparing', label: 'In progress', count: sorted.filter(order => !order.allReady && order.items.some(item => item.status !== 'pending')).length },
    { key: 'ready', label: 'Ready', count: sorted.filter(order => order.allReady).length },
  ];
  const returnToIncoming = (order: PrepOrder) => navigate('/kitchen/incoming', { replace: true, state: { kitchenNotice: `Order ${order.orderNumber} sent to cashier.` } });
  const update = async (item: PrepItem, status: KitchenStatus, order: PrepOrder) => {
    let allReady = false;
    const saved = await feed.act(item.id, async () => { const response = await workflowAPI.setItemStatus(item.id, status); allReady = response.data.allReady; return response; }, `${item.name} is ${status}.`);
    if (saved && allReady) returnToIncoming(order);
  };
  const finish = async (order: PrepOrder) => {
    if (await feed.act(-order.id, () => ordersAPI.updateOrderStatus(order.id, 'ready'), `Order ${order.orderNumber} is ready.`)) returnToIncoming(order);
  };

  return <KitchenBoard title="Prep Board" description="When the ticket is finished, tap Done to send it and return to incoming." queueLabel={target ? 'Current order first' : 'Oldest first'} filters={filters} selected={filter} onSelect={key => { setFilter(key); if (target) setParams({}); }} loading={feed.loading} refreshing={feed.refreshing} updatedAt={feed.updatedAt} error={feed.error} notice={feed.notice} busy={feed.busy.size > 0} refresh={feed.refresh}>
    {visible.length ? <div className="kitchen-grid">{visible.map(order => {
      const ready = order.items.filter(item => item.status === 'ready').length;
      const sending = feed.busy.has(-order.id), updating = sending || order.items.some(item => feed.busy.has(item.id));
      return <KitchenTicket key={order.id} order={order} placedAt={order.placedAt} highlighted={order.id === target} footer={<>
        <div className={`kitchen-progress ${order.allReady ? 'ready' : ''}`}><span>{order.allReady ? <><Send size={17} />Sent to Cashier</> : <>{ready} of {order.items.length} items ready</>}</span><span>{order.allReady ? <CheckCircle2 size={18} /> : `${Math.round(ready / Math.max(1, order.items.length) * 100)}%`}</span></div>
        <div className="kitchen-progress-track" role="progressbar" aria-label={`Order ${order.orderNumber} preparation`} aria-valuenow={ready} aria-valuemin={0} aria-valuemax={order.items.length || 1}><span style={{ width: `${ready / Math.max(1, order.items.length) * 100}%` }} /></div>
        <div className="kitchen-actions kitchen-actions-single kitchen-finish"><button type="button" className="kitchen-ready" disabled={updating || Boolean(feed.error) || (!order.allReady && order.status !== 'preparing') || !order.items.length} onClick={() => order.allReady ? returnToIncoming(order) : void finish(order)}><Send size={17} />{sending ? 'Sending…' : order.allReady ? 'Back to incoming' : 'Done · send to cashier'}</button></div>
      </>}>
        <ul className="kitchen-items">{order.items.map(item => {
          const busy = feed.busy.has(item.id), blocked = busy || sending || Boolean(feed.error);
          return <li className="kitchen-item" key={item.id} aria-label={`${item.name} preparation`}>
            <div className="kitchen-item-info"><span className="kitchen-quantity">{item.quantity}×</span><div><p className="kitchen-item-name">{item.name}</p>{modifierText(item.modifiers) && <p className="kitchen-modifiers">{modifierText(item.modifiers)}</p>}<p className="kitchen-item-status">{item.status === 'ready' ? 'Ready for handover' : item.status === 'preparing' ? 'Preparing now' : 'Waiting to start'}</p></div></div>
            <div className="kitchen-actions kitchen-item-actions">
              <button type="button" className={item.status === 'ready' ? 'kitchen-reopen' : 'kitchen-start'} disabled={blocked || item.status === 'preparing'} aria-label={item.status === 'ready' ? `Reopen ${item.name}` : `Start ${item.name}`} onClick={() => void update(item, 'preparing', order)}>{item.status === 'ready' ? <RotateCcw size={16} /> : <Play size={16} />}{busy ? 'Saving…' : item.status === 'ready' ? 'Reopen' : item.status === 'preparing' ? 'Preparing' : 'Start'}</button>
              <button type="button" className={`kitchen-ready ${item.status === 'ready' ? 'kitchen-item-done' : ''}`} disabled={blocked || item.status !== 'preparing'} aria-label={`Mark ${item.name} ready`} onClick={() => void update(item, 'ready', order)}><Check size={18} />{busy && item.status === 'preparing' ? 'Saving…' : item.status === 'ready' ? 'Ready' : 'Mark ready'}</button>
            </div>
          </li>;
        })}</ul>
      </KitchenTicket>;
    })}</div> : <><KitchenEmpty label={missingTarget ? 'This order is no longer in the kitchen' : filter === 'all' ? 'Nothing to prepare' : filter === 'ready' ? 'No ready tickets' : 'No tickets in progress'} />{missingTarget && <div className="kitchen-actions kitchen-actions-single"><button type="button" onClick={() => navigate('/kitchen/incoming')}>Back to incoming</button></div>}</>}
  </KitchenBoard>;
}
