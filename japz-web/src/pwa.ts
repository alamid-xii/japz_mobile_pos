const localHost = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
export interface InstallPrompt extends Event { prompt():Promise<void>; userChoice:Promise<{outcome:'accepted' | 'dismissed'}> }
let pending:InstallPrompt | null = null;
export const pendingInstallPrompt = () => pending;
export const clearInstallPrompt = () => { pending = null; };
// Capture early: installation may become available while the intro is playing.
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pending = event as InstallPrompt; window.dispatchEvent(new Event('japz:install-ready')); });
window.addEventListener('appinstalled', clearInstallPrompt);
// Local development remains available over HTTP. Installed production apps need TLS.
export const redirectingToHttps = import.meta.env.PROD && location.protocol === 'http:' && !localHost && !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
if (redirectingToHttps) {
  const secure = new URL(location.href); secure.protocol = 'https:'; location.replace(secure);
}
export function registerOrderingWorker() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  // Never reload an active checkout to activate a worker update. New versions
  // take control after existing tabs close, using the normal worker lifecycle.
  void navigator.serviceWorker.register('/sw.js', { scope:'/', updateViaCache:'none' }).catch(error => console.warn('Offline page could not be installed.', error));
}
