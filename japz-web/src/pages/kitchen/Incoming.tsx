import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Mic, Play } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeedback } from '../../components/FeedbackProvider';
import { KitchenBoard, KitchenEmpty, KitchenTicket, type KitchenStatus } from '../../components/kitchen/KitchenBoard';
import { useKitchen, type KitchenOrder } from '../../contexts/KitchenContext';
import { modifierText } from '../../utils/kitchen';
import { ordersAPI } from '../../services/api';

interface VoiceRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  start: () => void;
  stop: () => void;
}

export default function KitchenIncoming() {
  const { feed, broadcast: speak } = useKitchen();
  const refreshOrders = feed.refresh;
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const returnedNotice = (location.state as { kitchenNotice?: string } | null)?.kitchenNotice || '';
  const [filter, setFilter] = useState<KitchenStatus>('pending');
  const [listening, setListening] = useState(false);
  const recognition = useRef<VoiceRecognition | null>(null);

  useEffect(() => { if (returnedNotice) void refreshOrders(); }, [returnedNotice, refreshOrders]);


  useEffect(() => () => {
    if (!recognition.current) return;
    recognition.current.onstart = null;
    recognition.current.onend = null;
    recognition.current.onresult = null;
    recognition.current.onerror = null;
    try { recognition.current.stop(); } catch { /* Recognition may already have ended. */ }
  }, []);

  const broadcast = () => {
    if (listening) { recognition.current?.stop(); return; }
    const browser = window as Window & { SpeechRecognition?: new () => VoiceRecognition; webkitSpeechRecognition?: new () => VoiceRecognition };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) { notify('Voice broadcast is not supported in this browser.'); return; }
    try {
      const session = new Recognition();
      session.lang = 'en-US';
      session.interimResults = false;
      session.maxAlternatives = 1;
      session.onstart = () => setListening(true);
      session.onend = () => setListening(false);
      session.onerror = () => { setListening(false); notify('Microphone is unavailable. Check the browser microphone permission and try again.'); };
      session.onresult = event => speak(event.results[0][0].transcript);
      recognition.current = session;
      session.start();
    } catch { notify('Voice broadcast could not start. Please try again.'); }
  };
  const sorted = [...feed.orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
  const visible = sorted.filter(order => order.status === filter);
  const filters = (['pending', 'preparing', 'ready'] as const).map(key => ({ key, label: key[0].toUpperCase() + key.slice(1), count: sorted.filter(order => order.status === key).length }));
  const prepare = async (order: KitchenOrder) => {
    if (order.status === 'preparing' || await feed.act(order.id, () => ordersAPI.updateOrderStatus(order.id, 'preparing'), `Order ${order.orderNumber} is preparing.`)) {
      navigate(`/kitchen/prep?order=${order.id}`);
    }
  };

  return <KitchenBoard title="Incoming orders" description="Start a ticket to open it in Prep Board." filters={filters} selected={filter} onSelect={key => setFilter(key as KitchenStatus)} loading={feed.loading} refreshing={feed.refreshing} updatedAt={feed.updatedAt} error={feed.error} notice={returnedNotice || feed.notice} busy={feed.busy.size > 0} refresh={feed.refresh} tools={<>
    <button type="button" aria-label={listening ? 'Stop voice broadcast' : 'Start voice broadcast'} aria-pressed={listening} title="Voice broadcast" onClick={broadcast}><Mic size={19} /><span>{listening ? 'Stop' : 'Broadcast'}</span></button>
  </>}>
    {visible.length ? <div className="kitchen-grid">{visible.map(order => {
      const busy = feed.busy.has(order.id), blocked = busy || Boolean(feed.error);
      return <KitchenTicket key={order.id} order={order} placedAt={order.createdAt} footer={order.status === 'ready' ? <div className="kitchen-progress ready"><span><CheckCircle2 size={18} />Sent to Cashier</span><span>Ready for handover</span></div> : <div className="kitchen-actions kitchen-actions-single">
        <button type="button" className="kitchen-start" disabled={blocked || !order.items?.length} onClick={() => void prepare(order)}><Play size={17} />{busy ? 'Starting…' : order.status === 'preparing' ? 'Continue preparing' : 'Start Preparing'}<ArrowRight size={17} /></button>
      </div>}>
        <ul className="kitchen-items">{order.items?.map((item, index) => <li className="kitchen-item" key={item.id || index}><div className="kitchen-item-info"><span className="kitchen-quantity">{item.quantity}×</span><div><p className="kitchen-item-name">{item.name}</p>{modifierText(item.modifiers) && <p className="kitchen-modifiers">{modifierText(item.modifiers)}</p>}</div></div></li>)}</ul>
        {!order.items?.length && <p className="kitchen-modifiers">No item details available. Refresh before preparing this ticket.</p>}
      </KitchenTicket>;
    })}</div> : <KitchenEmpty label={`No ${filter} orders`} />}
  </KitchenBoard>;
}
