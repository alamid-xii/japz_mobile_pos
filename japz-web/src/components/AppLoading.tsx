export default function AppLoading() {
  const ordering = /^\/(japz|order)(\/|$)/.test(location.pathname);
  return <div className="app-boot" role="status" aria-label="Loading application"><img src="/logo.jpg" alt="JAPZ GRILL" width="100" height="100" /><strong>{ordering ? 'JAPZ GRILL' : 'JAPZ ERP'}</strong><span>{ordering ? 'Burger & Bistro' : 'Opening your workspace…'}</span></div>;
}
