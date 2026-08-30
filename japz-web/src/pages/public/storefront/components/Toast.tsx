import { Check } from 'lucide-react';

/** Brief confirmation after adding to the cart. */
export default function Toast({ message }: { message: string }) {
    return (
        <div className="fixed inset-x-0 top-16 z-50 flex justify-center pointer-events-none px-4">
            <div className="bg-gray-900 text-white text-sm font-semibold rounded-full pl-2.5 pr-4 py-2 flex items-center gap-2 shadow-xl animate-[slideDown_200ms_ease-out]">
                <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                    <Check size={12} strokeWidth={3} className="text-gray-900" />
                </span>
                {message}
            </div>
        </div>
    );
}
