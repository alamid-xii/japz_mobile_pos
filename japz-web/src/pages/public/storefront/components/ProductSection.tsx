import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
    title: string;
    subtitle?: string;
    onViewAll?: () => void;
    children: ReactNode;
}

export default function ProductSection({ title, subtitle, onViewAll, children }: Props) {
    return (
        <section>
            <div className="flex items-end justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <h2 className="font-extrabold text-gray-900 text-[17px] leading-tight">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center transition duration-150"
                    >
                        View all <ChevronRight size={14} />
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}
