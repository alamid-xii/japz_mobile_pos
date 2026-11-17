import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import Modal from './Modal';
import { clearInstallPrompt,pendingInstallPrompt } from '../pwa';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome:'accepted' | 'dismissed' }>;
}
const dismissedKey = 'japz.install.dismissed';
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?:boolean }).standalone);
const wasDismissed = () => { try { return localStorage.getItem(dismissedKey) === 'yes'; } catch { return false; } };
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(pendingInstallPrompt);
  const [installed, setInstalled] = useState(isInstalled);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [instructions, setInstructions] = useState(false);
  useEffect(() => {
    const offer = (event:Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const completed = () => { setInstalled(true); setPrompt(null); setInstructions(false); };
    const display = matchMedia('(display-mode: standalone)');
    const available = () => setPrompt(pendingInstallPrompt());
    const changed = () => setInstalled(isInstalled());
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', completed);
    window.addEventListener('japz:install-ready', available);
    display.addEventListener('change', changed);
    return () => { window.removeEventListener('beforeinstallprompt', offer); window.removeEventListener('appinstalled', completed); window.removeEventListener('japz:install-ready',available); display.removeEventListener('change', changed); };
  }, []);
  const dismiss = () => { setDismissed(true); setInstructions(false); try { localStorage.setItem(dismissedKey, 'yes'); } catch { /* Respect dismissal for this page. */ } };
  const install = async () => {
    if (isIOS()) { setInstructions(true); return; }
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'dismissed') dismiss();
    } catch { /* The browser can withdraw an install offer; normal ordering remains available. */ }
    finally { clearInstallPrompt(); setPrompt(null); }
  };
  if (installed || dismissed || !window.isSecureContext || (!prompt && !isIOS())) return null;
  return <><div className="storefront-install"><button onClick={() => void install()}><Download size={17} />Install App</button><button aria-label="Dismiss install offer" onClick={dismiss}><X size={16} /></button></div>
    {instructions && <Modal label="Install JAPZ GRILL on iPhone" onClose={() => setInstructions(false)} className="storefront-install-dialog">
      <Share size={28} /><h2>Install JAPZ GRILL</h2><p>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p><p>Keep <strong>Open as Web App</strong> enabled if shown, then tap <strong>Add</strong>. If your browser does not show the option, open this page in Safari.</p><button onClick={() => setInstructions(false)}>Got it</button><button onClick={dismiss}>Not now</button>
    </Modal>}
  </>;
}
