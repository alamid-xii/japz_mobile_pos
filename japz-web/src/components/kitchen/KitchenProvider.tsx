import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { KitchenContext, type KitchenOrder } from '../../contexts/KitchenContext';
import { useAuth } from '../../hooks/useAuth';
import { useKitchenFeed } from '../../hooks/useKitchenFeed';
import { getApiBaseUrl, ordersAPI } from '../../services/api';
import { KitchenSpeech, type SpeakerState } from '../../services/kitchenSpeech';

const memory = new Map<string, string>();
function storage(): Pick<Storage, 'getItem' | 'setItem'> {
  try { return window.localStorage; }
  catch { return { getItem: key => memory.get(key) || null, setItem: (key, value) => { memory.set(key, value); } }; }
}

/** Lives above kitchen routes so polling and speech survive the Prep Board flow. */
export default function KitchenProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const load = useCallback(async () => (await ordersAPI.getIncomingByCategories({ assignedCategories: user?.assignedCategories || [] })).data.orders as KitchenOrder[], [user?.assignedCategories]);
  const feed = useKitchenFeed(load, 3000);
  const engine = useRef<KitchenSpeech | null>(null);
  const [speaker, setSpeaker] = useState<SpeakerState>({ enabled: true, supported: true, speaking: false, queued: 0, blocked: false, error: '' });

  useEffect(() => {
    const controller = new KitchenSpeech({
      key: `japz.kitchen.speech.v1:${getApiBaseUrl()}:${userId}`,
      storage: storage(),
      speech: typeof window.SpeechSynthesisUtterance === 'function' && window.speechSynthesis ? window.speechSynthesis : null,
      utterance: text => new SpeechSynthesisUtterance(text),
      locks: navigator.locks,
      changed: setSpeaker,
    });
    engine.current = controller;
    return () => { controller.dispose(); engine.current = null; };
  }, [userId]);

  useEffect(() => { if (feed.updatedAt) engine.current?.observe(feed.orders); }, [feed.orders, feed.updatedAt]);

  const toggleSpeaker = () => {
    if (!speaker.enabled || speaker.blocked) engine.current?.resume();
    else engine.current?.mute();
  };
  return <KitchenContext.Provider value={{ feed, speaker, toggleSpeaker, broadcast: text => engine.current?.broadcast(text) }}>{children}</KitchenContext.Provider>;
}
