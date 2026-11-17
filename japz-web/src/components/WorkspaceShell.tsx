import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock3, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useShift } from '../contexts/ShiftContext';
import '../styles/workspace.css';

export interface NavigationGroup {
  label: string;
  items: { path: string; label: string; icon: LucideIcon; notification?: { count: number; description: string } }[];
}
interface Props { title: string; groups: NavigationGroup[]; children: ReactNode; headerActions?: ReactNode; contentClassName?: string }

export default function WorkspaceShell({ title, groups, children, headerActions, contentClassName = '' }: Props) {
  const { user, logout, loading: signingOut } = useAuth();
  const shift = useShift();
  const location = useLocation();
  const [openedPath, setOpenedPath] = useState('');
  const open = openedPath === location.pathname;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(`japz.sidebar.${title}`) === 'collapsed');
  const toggle = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const previousOpen = useRef(false);
  const notificationPrefix = useId();
  const notificationId = (path: string) => `${notificationPrefix}-notification-${path.replace(/\//g, '-')}`;
  const items = groups.flatMap(group => group.items);
  const active = items.filter(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')).sort((a, b) => b.path.length - a.path.length)[0];
  useEffect(() => {
    if (previousOpen.current && !open) {
      if ((openedPath && openedPath !== location.pathname) || window.matchMedia('(min-width: 768px)').matches) document.getElementById('main-content')?.focus();
      else toggle.current?.focus();
    }
    previousOpen.current = open;
  }, [open, openedPath, location.pathname]);
  useEffect(() => {
    if (!open) return;
    sidebar.current?.querySelector<HTMLElement>('button, a, input')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedPath('');
      if (event.key !== 'Tab') return;
      const elements = [...(sidebar.current?.querySelectorAll<HTMLElement>('a, button, input') || [])].filter(element => element.getClientRects().length && !element.hasAttribute('disabled'));
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  useEffect(() => {
    const desktop = matchMedia('(min-width: 768px)');
    const resize = () => { if (desktop.matches) setOpenedPath(''); };
    desktop.addEventListener('change', resize);
    return () => desktop.removeEventListener('change', resize);
  }, []);
  const expand = () => {
    setCollapsed(value => { localStorage.setItem(`japz.sidebar.${title}`, value ? 'expanded' : 'collapsed'); return !value; });
  };
  return <div className={`workspace-shell ${collapsed ? 'workspace-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {items.filter(item => item.notification).map(item => <span key={item.path} id={notificationId(item.path)} className="workspace-sr-only" role="status" aria-live="polite" aria-atomic="true">{item.notification?.description}</span>)}
    {open && <div className="workspace-backdrop" onClick={() => setOpenedPath('')} />}
    <aside ref={sidebar} id="workspace-navigation" className={`workspace-sidebar ${open ? 'workspace-open' : ''}`} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={`${title} navigation`}>
      <div className="workspace-brand"><img src="/logo.jpg" alt="JAPZ" /><div className="workspace-label"><strong>JAPZ POS</strong><span>{title} workspace</span></div><button className="workspace-close workspace-icon-button" aria-label="Close navigation" onClick={() => setOpenedPath('')}><X size={20} /></button></div>
      <nav aria-label="Workspace navigation">{groups.map(group => <section key={group.label}><p className="workspace-section workspace-label">{group.label}</p>{group.items.map(({ path, label, icon: Icon, notification }) => <NavLink end={path === active?.path} key={path} to={path} onClick={() => { if (location.pathname === path) setOpenedPath(''); }} title={collapsed ? label : undefined} className={active?.path === path ? 'workspace-link active' : 'workspace-link'} aria-label={label} aria-describedby={notification?.description ? notificationId(path) : undefined}><Icon size={19} /><span className="workspace-label">{label}</span>{notification && notification.count > 0 && <span className="workspace-notification-badge" aria-hidden="true">{notification.count > 99 ? '99+' : notification.count}</span>}{active?.path === path && <ChevronRight size={15} className="workspace-active-arrow workspace-label" />}</NavLink>)}</section>)}</nav>
      <div className="workspace-user">
        <div className="workspace-user-info"><span className="workspace-avatar">{user?.name.charAt(0).toUpperCase()}</span><div className="workspace-label"><strong>{user?.name}</strong><span>{user?.email}</span></div></div>
        <button className="workspace-sign-out" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={() => void logout()}><LogOut size={18} /><span className="workspace-label">{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
      </div>
      <button className="workspace-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={expand}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}<span className="workspace-label">Collapse sidebar</span></button>
    </aside>
    <div className="workspace-body" inert={open}>
      <header className="workspace-topbar">
        <button ref={toggle} className="workspace-menu workspace-icon-button" aria-expanded={open} aria-controls="workspace-navigation" aria-label="Open navigation" onClick={() => setOpenedPath(location.pathname)}><Menu size={21} /></button>
        <div className="workspace-breadcrumb"><span>{title}</span><ChevronRight size={14} /><strong>{active?.label || title}</strong></div>
        <div className="workspace-actions">{headerActions}{user?.role !== 'admin' && <Link to="/attendance" className="workspace-top-duty" aria-label="Clock in / out" title={shift.record?.clockIn ? `On duty since ${new Date(shift.record.clockIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}` : 'Manage your shift'}><Clock3 size={17} /><span>Clock in / out</span><span className="workspace-duty-status"><span className="workspace-duty-dot" />{shift.onDuty ? 'On duty' : 'Off duty'}</span></Link>}</div>
      </header>
      <main id="main-content" tabIndex={-1} inert={open} className={`workspace-content app-main ${contentClassName}`}>{children}</main>
    </div>
  </div>;
}
