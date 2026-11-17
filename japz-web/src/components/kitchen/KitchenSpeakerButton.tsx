import { Volume2, VolumeX } from 'lucide-react';
import { useKitchen } from '../../contexts/KitchenContext';

export default function KitchenSpeakerButton() {
  const { speaker, toggleSpeaker } = useKitchen();
  const action = !speaker.supported ? 'Speaker unavailable' : speaker.blocked ? speaker.error.includes('Enable') ? 'Enable speaker' : 'Retry speaker' : speaker.enabled ? 'Mute order alerts' : 'Enable order alerts';
  const text = !speaker.supported ? 'No speaker' : speaker.blocked ? action : speaker.enabled ? 'Sound on' : 'Sound off';
  return <button type="button" aria-label={action} aria-pressed={speaker.enabled && !speaker.blocked && speaker.supported} disabled={!speaker.supported} title={!speaker.supported ? 'This browser does not support spoken order announcements.' : speaker.error || `${speaker.queued} announcement${speaker.queued === 1 ? '' : 's'} queued${speaker.speaking ? ' · Speaking' : ''}`} onClick={toggleSpeaker}>
    {speaker.supported && speaker.enabled && !speaker.blocked ? <Volume2 size={19} /> : <VolumeX size={19} />}<span>{text}</span>
  </button>;
}
