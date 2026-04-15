import { useNavigate } from 'react-router-dom';

export default function RoleSelection() {
    const navigate = useNavigate();
    const handleRole = (role: string) => navigate(`/login?role=${role}`);

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 py-6 bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white overflow-hidden">
            <div className="w-full max-w-[420px] flex flex-col items-center md:bg-white md:rounded-2xl md:shadow-lg md:px-10 md:py-10">
                <img src="/logo.jpg" alt="JAPZ POS" className="w-[72px] h-[72px] rounded-lg object-contain mb-2 md:w-[120px] md:h-[120px] md:mb-5" />
                <h1 className="text-lg font-bold text-center mb-4 text-gray-900 md:text-2xl">Select Your Role</h1>
                <div className="w-full flex flex-col gap-3">
                    <button className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all" onClick={() => handleRole('admin')}>Admin</button>
                    <button className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all" onClick={() => handleRole('cashier')}>Cashier</button>
                    <button className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all" onClick={() => handleRole('kitchen')}>Kitchen Staff</button>
                </div>
            </div>
        </div>
    );
}
