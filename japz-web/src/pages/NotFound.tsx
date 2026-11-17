import { Link } from 'react-router-dom';
export default function NotFound() {
    return <main className="auth-shell"><div className="auth-panel text-center">
        <img src="/logo.jpg" width="72" height="72" alt="JAPZ POS" className="mb-5 rounded-lg" />
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">This page may have moved. Return to your workspace to continue.</p>
        <Link to="/" className="bg-brand rounded-md px-5 py-3 font-semibold">Return to JAPZ POS</Link>
        <Link to="/japz" className="mt-4 underline">Open Online Ordering</Link>
    </div></main>;
}
