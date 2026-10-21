import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="auth-shell">
            <div className="auth-panel">
                <img src="/logo.jpg" alt="JAPZ POS" className="auth-logo" />
                <h1 className="text-lg font-bold text-center mb-1 text-gray-900 md:text-2xl">Welcome to JAPZ POS</h1>
                <p className="text-xs text-center text-gray-500 mb-4 md:text-sm md:mb-7">Complete POS and Communication System</p>
                <div className="w-full flex flex-col gap-3">
                    <button
                        className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all"
                        onClick={() => navigate('/register')}
                    >
                        Get Started
                    </button>
                    <p className="text-sm text-center text-gray-500">
                        Already have an account?{' '}
                        <Link className="text-yellow-700 underline cursor-pointer" to="/login">Login Here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
