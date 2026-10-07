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
  return (
    <div className="inv-shell">
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
        aria-label="Admin navigation"
      >
        <div className="inv-brand">
          <img src="/logo.jpg" alt="JAPZ" />
          <div>
            <strong>JAPZ POS</strong>
            <span>Admin</span>
          </div>
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
        <div className="inv-topbar">
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
        <main className="inv-content" inert={open}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
