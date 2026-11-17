export interface SpokenOrder {
  id: number;
  createdAt: string;
  status: string;
  customerName?: string | null;
  notes?: string | null;
  items?: { name: string; quantity: number; modifiers?: Record<string, unknown> | null; notes?: string | null }[];
}

const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, ' and ').replace(/&nbsp;/gi, ' ').replace(/\s*&\s*/g, ' and ').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
const label = (value: string) => clean(value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' '));
function details(value: unknown, key = ''): string[] {
  if (/^(id|itemId|menuItemId|categoryId|price|unitPrice|priceDelta|amount|total|cost|currency)$/i.test(key)) return [];
  if (typeof value === 'string') return clean(value) ? [clean(value)] : [];
  if (typeof value === 'number') return Number.isFinite(value) ? [key ? `${label(key)} ${value}` : String(value)] : [];
  if (value === true) return key ? [label(key)] : [];
  if (Array.isArray(value)) return value.flatMap(entry => details(entry, key));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([name, entry]) => details(entry, name));
  return [];
}

export function orderAnnouncement(order: SpokenOrder): string {
  const items = (order.items || []).map(item => {
    const modifiers = [...new Set(details(item.modifiers))];
    const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? String(Number(item.quantity)) : 'quantity unavailable';
    return `${quantity} ${clean(item.name) || 'unnamed item'}${modifiers.length ? `, ${modifiers.join(', ')}` : ''}${item.notes ? `, item note: ${clean(item.notes)}` : ''}`;
  });
  const notes = order.notes ? clean(order.notes) : '';
  return `New order for ${clean(order.customerName || '') || 'Walk-in customer'}: ${items.join(', ') || 'item details unavailable'}.${notes ? ` Order notes: ${notes}${/[.!?]$/.test(notes) ? '' : '.'}` : ''}`;
}

/** Short phrases avoid long native utterances stalling; each order stays together. */
export function speechParts(text: string, limit = 220): string[] {
  const parts: string[] = [];
  let remaining = text.trim();
  while (remaining.length > limit) {
    const prefix = remaining.slice(0, limit);
    const punctuation = Math.max(prefix.lastIndexOf('. '), prefix.lastIndexOf('; '), prefix.lastIndexOf(', '));
    const boundary = punctuation > limit / 2 ? punctuation + 1 : prefix.lastIndexOf(' ');
    const cut = boundary > 0 ? boundary : limit;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

export interface SpeakerState {
  enabled: boolean;
  supported: boolean;
  speaking: boolean;
  queued: number;
  blocked: boolean;
  error: string;
}
interface Ledger { initialized: boolean; seen: string[]; pending: string[]; enabled: boolean }
interface Entry { id?: string; parts: string[]; part: number; started: boolean }
interface Options {
  key: string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  speech: SpeechSynthesis | null;
  utterance: (text: string) => SpeechSynthesisUtterance;
  locks?: LockManager;
  changed: (state: SpeakerState) => void;
}

/** One native utterance at a time, with an ID-only ledger scoped to this station. */
export class KitchenSpeech {
  private options: Options;
  private seen = new Set<string>();
  private pending = new Set<string>();
  private initialized = false;
  private enabled = true;
  private queue: Entry[] = [];
  private current: Entry | null = null;
  private active: SpeechSynthesisUtterance | null = null;
  private blocked = false;
  private error = '';
  private disposed = false;
  private draining = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private finish: (() => void) | null = null;

  constructor(options: Options) {
    this.options = options;
    const ledger = this.read();
    if (ledger) {
      this.initialized = ledger.initialized;
      this.seen = new Set(ledger.seen);
      this.pending = new Set(ledger.pending);
      this.enabled = ledger.enabled;
    }
    this.emit();
  }

  private read(): Ledger | null {
    try {
      const data = JSON.parse(this.options.storage.getItem(this.options.key) || 'null') as Ledger | null;
      return data && typeof data.initialized === 'boolean' && Array.isArray(data.seen) && Array.isArray(data.pending) && [...data.seen, ...data.pending].every(id => typeof id === 'string') ? { ...data, enabled: data.enabled !== false } : null;
    } catch { return null; }
  }

  private save() {
    // Merge completed IDs from another tab without storing names, food or notes.
    const previous = this.read();
    previous?.seen.forEach(id => this.seen.add(id));
    this.seen.forEach(id => this.pending.delete(id));
    try {
      this.options.storage.setItem(this.options.key, JSON.stringify({ initialized: this.initialized, seen: [...this.seen], pending: [...this.pending], enabled: this.enabled }));
    } catch { /* In-memory duplicate prevention remains when storage is unavailable. */ }
  }

  private emit() {
    if (!this.disposed) this.options.changed({ enabled: this.enabled, supported: Boolean(this.options.speech), speaking: Boolean(this.active), queued: this.queue.length + Number(Boolean(this.current)), blocked: this.blocked, error: this.error });
  }

  observe(orders: SpokenOrder[]) {
    if (this.disposed) return;
    const sorted = [...orders].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
    if (!this.initialized) {
      sorted.forEach(order => this.seen.add(String(order.id)));
      this.initialized = true;
      this.save();
      return;
    }
    this.read()?.seen.forEach(id => this.seen.add(id));
    const currentIds = new Set(sorted.map(order => String(order.id)));
    for (const id of this.pending) {
      if (!currentIds.has(id) && this.current?.id !== id) { this.pending.delete(id); this.seen.add(id); }
    }
    this.queue = this.queue.filter(entry => !entry.id || entry.part > 0 || (!this.seen.has(entry.id) && currentIds.has(entry.id)));
    for (const order of sorted) {
      const id = String(order.id);
      if (this.seen.has(id) || this.current?.id === id) continue;
      if (order.status !== 'pending' && !this.pending.has(id)) { this.seen.add(id); continue; }
      const parts = speechParts(orderAnnouncement(order));
      const existing = this.queue.find(entry => entry.id === id);
      if (existing) existing.parts = parts;
      else { this.pending.add(id); this.queue.push({ id, parts, part: 0, started: false }); }
    }
    this.save();
    this.emit();
    this.drain();
  }

  broadcast(text: string) {
    const parts = speechParts(clean(text));
    if (!parts.length || this.disposed) return;
    this.queue.push({ parts, part: 0, started: false });
    this.resume();
  }

  enable() {
    this.enabled = true;
    this.blocked = false;
    this.error = '';
    this.save();
    this.emit();
    this.drain();
  }

  mute() {
    this.enabled = false;
    // Pause native speech instead of replaying a partly announced order later.
    if (this.active) this.options.speech?.pause();
    this.save();
    this.emit();
  }

  private drain() {
    if (this.disposed || this.draining || !this.enabled || this.blocked || !this.options.speech || !this.queue.length) return;
    this.draining = true;
    const play = async () => {
      if (this.disposed || !this.enabled || this.blocked) return;
      this.read()?.seen.forEach(id => this.seen.add(id));
      while (this.queue[0]?.id && this.queue[0].part === 0 && this.seen.has(this.queue[0].id)) this.queue.shift();
      const entry = this.queue.shift();
      if (entry) await this.play(entry);
    };
    const task = this.options.locks
      ? this.options.locks.request(`${this.options.key}:speaker`, { ifAvailable: true }, async lock => { if (!lock) return false; await play(); return true; })
      : play().then(() => true);
    void task.catch(() => { this.blocked = true; this.error = 'Speaker is unavailable. Tap Retry speaker.'; }).finally(() => {
      this.draining = false;
      this.emit();
      if (!this.disposed && this.enabled && !this.blocked && this.queue.length) this.retryTimer = setTimeout(() => this.drain(), 150);
    });
  }

  private async play(entry: Entry) {
    this.current = entry;
    for (; entry.part < entry.parts.length; entry.part++) {
      if (this.disposed) break;
      if (!this.enabled) { this.queue.unshift(entry); break; }
      const ended = await new Promise<boolean>(resolve => {
        const utterance = this.options.utterance(entry.parts[entry.part]);
        const voices = this.options.speech!.getVoices();
        const voice = voices.find(voice => voice.localService && /^en[-_]PH$/i.test(voice.lang)) || voices.find(voice => voice.localService && /^en\b/i.test(voice.lang)) || voices.find(voice => /^en\b/i.test(voice.lang));
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;
        this.active = utterance;
        let settled = false;
        const finish = (success: boolean) => {
          if (settled) return;
          settled = true;
          utterance.onstart = null;
          utterance.onend = null;
          utterance.onerror = null;
          this.active = null;
          this.finish = null;
          this.emit();
          resolve(success);
        };
        this.finish = () => finish(false);
        utterance.onstart = () => {
          entry.started = true;
          if (entry.id) { this.seen.add(entry.id); this.pending.delete(entry.id); this.save(); }
          this.emit();
        };
        utterance.onend = () => finish(true);
        utterance.onerror = event => {
          this.blocked = true;
          this.error = event.error === 'not-allowed' ? 'Tap Enable speaker to allow spoken orders.' : 'Speech could not play. Tap Retry speaker.';
          finish(false);
        };
        try { if (this.options.speech!.paused) this.options.speech!.resume(); this.options.speech!.speak(utterance); }
        catch { this.blocked = true; this.error = 'Speech could not play. Tap Retry speaker.'; finish(false); }
        this.emit();
      });
      if (!ended) {
        // Never repeat a phrase which actually began; retry only unsaid speech.
        if (entry.started) entry.part++;
        entry.started = false;
        if (!this.disposed && entry.part < entry.parts.length) this.queue.unshift(entry);
        break;
      }
      entry.started = false;
    }
    this.current = null;
    this.emit();
  }

  resume() {
    this.enable();
    if (this.active) this.options.speech?.resume();
  }

  dispose() {
    this.disposed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const wasSpeaking = Boolean(this.active);
    this.finish?.();
    if (wasSpeaking) this.options.speech?.cancel();
    this.queue = [];
  }
}
