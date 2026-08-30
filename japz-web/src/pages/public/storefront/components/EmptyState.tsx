import type { LucideIcon } from 'lucide-react';

interface Props {
    icon: LucideIcon;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: Props) {
    return (
        <div className="px-4 py-16 text-center max-w-sm mx-auto">
            <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-5">
                <Icon size={32} className="text-gray-400" />
            </div>
            <p className="font-bold text-gray-900 text-lg mb-1.5">{title}</p>
            <p className="text-sm text-gray-500 mb-6">{body}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="bg-brand text-gray-900 font-extrabold rounded-full px-7 py-3.5 shadow-sm active:scale-95 transition duration-150"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
