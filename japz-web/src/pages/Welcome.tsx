import { useNavigate } from 'react-router-dom';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 py-6 bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white overflow-hidden">
            <div className="w-full max-w-[420px] flex flex-col items-center md:bg-white md:rounded-2xl md:shadow-lg md:px-10 md:py-10">
                <img src="/logo.jpg" alt="JAPZ POS" className="w-[72px] h-[72px] rounded-lg object-contain mb-2 md:w-[120px] md:h-[120px] md:mb-5" />
                <h1 className="text-lg font-bold text-center mb-1 text-gray-900 md:text-2xl">Welcome to JAPZ POS</h1>
                <p className="text-xs text-center text-gray-500 mb-4 md:text-sm md:mb-7">Complete POS and Communication System</p>
                <div className="w-full flex flex-col gap-3">
                    <button
                        className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all"
                        onClick={() => navigate('/register')}
                    >
                        Get Started
                    </button>
                    <p className="text-sm text-center text-gray-500">
                        Already have an account?{' '}
                        <span className="text-yellow-700 underline cursor-pointer" onClick={() => navigate('/login')}>Login Here</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
