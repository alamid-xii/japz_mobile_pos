import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  MessageCircle,
  BarChart3,
  Settings,
  Ticket,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import "../features/inventory/inventory.css";
const tabs = [
  ["/admin/dashboard", "Dashboard", LayoutDashboard],
  ["/admin/employees", "Users", Users],
  ["/admin/menu", "Menu", Package],
  ["/admin/inventory", "Inventory", Warehouse],
  ["/admin/sales", "Sales", BarChart3],
  ["/admin/discounts-vouchers", "Promotions", Ticket],
  ["/admin/feedback", "Feedback", MessageCircle],
  ["/admin/settings", "Settings", Settings],
] as const;
export default function AdminLayout() {
  const { user, logout } = useAuth(),
    location = useLocation(),
    [openedPath, setOpenedPath] = useState(""),
    open = openedPath === location.pathname,
    setOpen = (value: boolean) => setOpenedPath(value ? location.pathname : ""),
    toggle = useRef<HTMLButtonElement>(null),
    aside = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) {
      const navigated = openedPath && openedPath !== location.pathname;
      if (navigated || window.matchMedia('(min-width: 768px)').matches) document.getElementById('main-content')?.focus();
      else toggle.current?.focus();
    }
    wasOpen.current = open;
  }, [open, openedPath, location.pathname]);
  useEffect(() => {
    if (!open) return;
    aside.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenedPath("");
        toggle.current?.focus();
      }
      if (event.key === "Tab") {
        const elements = [
            ...(aside.current?.querySelectorAll<HTMLElement>("a,button") || []),
          ],
          first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const close = () => { if (desktop.matches) setOpenedPath(''); };
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);
  return (
    <div className="inv-shell"><a className="skip-link" href="#main-content">Skip to content</a>
      {open && (
        <div
          className="inv-nav-backdrop"
          onClick={() => {
            setOpen(false);
            toggle.current?.focus();
          }}
        />
      )}
      <aside
        ref={aside}
        className={`inv-sidebar ${open ? "inv-sidebar-open" : ""}`}
        id="admin-navigation"
        role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Admin navigation"
      >
        <div className="inv-brand">
          <img src="/logo.jpg" alt="JAPZ" />
          <div>
            <strong>JAPZ POS</strong>
            <span>Admin</span>
          </div>
          <button className="inv-sidebar-close" aria-label="Close navigation" onClick={() => { setOpen(false); toggle.current?.focus(); }}><X size={20} /></button>
        </div>
        <nav>
          {tabs.map(([path, label, Icon]) => (
            <NavLink key={path} to={path}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="inv-user">
          <strong>{user?.name}</strong>
          <small>{user?.email}</small>
          <button onClick={() => void logout()}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="inv-main">
        <div className="inv-topbar" inert={open} aria-hidden={open || undefined}>
          <button
            ref={toggle}
            className="inv-menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="admin-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span>
            {tabs.find(([path]) => location.pathname === path)?.[1] || "Admin"}
          </span>
          <small>{user?.name}</small>
        </div>
        <main id="main-content" tabIndex={-1} className="inv-content" inert={open}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
