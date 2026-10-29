import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, Flame } from "lucide-react";

export default function ReservationLayout() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="Japz Grill home">
            <Flame size={29} fill="currentColor" />
            <span>
              JAPZ<span className="brand-small">GRILL · BURGER & BISTRO</span>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/manage">My reservation</NavLink>
            <Link to="/reserve" className="button button-small">
              Book a table <ArrowUpRight size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer container">
        <Link to="/" className="footer-brand">
          JAPZ GRILL<span>Good food. Better together.</span>
        </Link>
        <p>Online reservations · Philippine time (UTC+8)</p>
        <Link to="/login">
          Manager sign in <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
