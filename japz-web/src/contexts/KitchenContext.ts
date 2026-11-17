import { createContext, useContext } from 'react';
import type { KitchenTicketInfo } from '../components/kitchen/KitchenBoard';
import type { useKitchenFeed } from '../hooks/useKitchenFeed';
import type { SpeakerState } from '../services/kitchenSpeech';

export interface KitchenOrder extends KitchenTicketInfo {
  createdAt: string;
  items?: { id?: number; name: string; quantity: number; modifiers?: Record<string, unknown> | null; notes?: string | null }[];
}
interface KitchenContextValue {
  feed: ReturnType<typeof useKitchenFeed<KitchenOrder>>;
  speaker: SpeakerState;
  toggleSpeaker: () => void;
  broadcast: (text: string) => void;
}
export const KitchenContext = createContext<KitchenContextValue | null>(null);
export function useKitchen() {
  const context = useContext(KitchenContext);
  if (!context) throw new Error('Kitchen workspace is required');
  return context;
}
