import { useNavigate } from 'react-router-dom';

export default function RoleSelection() {
    const navigate = useNavigate();
    const handleRole = (role: string) => navigate(`/login?role=${role}`);

    return (
        <div className="auth-shell">
            <div className="auth-panel">
                <img src="/logo.jpg" alt="JAPZ POS" className="auth-logo" />
                <h1 className="text-lg font-bold text-center mb-4 text-gray-900 md:text-2xl">Select Your Role</h1>
                <div className="w-full flex flex-col gap-3">
                    <button className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all" onClick={() => handleRole('admin')}>Admin</button>
                    <button className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all" onClick={() => handleRole('cashier')}>Cashier</button>
                    <button className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all" onClick={() => handleRole('kitchen')}>Kitchen Staff</button>
                    <button className="w-full py-3 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 text-[15px]" onClick={() => handleRole('inventory')}>Inventory</button>
                </div>
            </div>
        </div>
    );
}
