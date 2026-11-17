import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { setTheme, subscribeTheme, themeSnapshot } from '../theme';

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot).split(':')[1];
  const enabled = theme === 'dark';
  const label = enabled ? 'Switch to light mode' : 'Switch to dark mode';
  return <button type="button" aria-label={label} className="theme-toggle" title={label} onClick={() => setTheme(enabled ? 'light' : 'dark')}>
    {enabled ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
  </button>;
}
