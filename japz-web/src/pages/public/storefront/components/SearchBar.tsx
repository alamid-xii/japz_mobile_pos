import { Search, X, SlidersHorizontal } from 'lucide-react';

export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'name';

export const SORT_LABELS: Record<SortKey, string> = {
    popular: 'Most popular',
    'price-asc': 'Price: low to high',
    'price-desc': 'Price: high to low',
    name: 'Name A–Z',
};

interface Props {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    sort?: SortKey;
    onSortChange?: (s: SortKey) => void;
    sortOpen?: boolean;
    onToggleSort?: () => void;
}

export default function SearchBar({
    value, onChange, placeholder = 'Search burgers, pasta, drinks...',
    sort, onSortChange, sortOpen, onToggleSort,
}: Props) {
    return (
        <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label="Search the menu"
                    className="w-full rounded-full bg-white text-slate-900 placeholder-slate-400 border border-gray-200 pl-11 pr-10 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition duration-150"
                />
                {value && (
                    <button
                        onClick={() => onChange('')}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 text-slate-500 flex items-center justify-center"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {onToggleSort && (
                <div className="relative shrink-0">
                    <button
                        onClick={onToggleSort}
                        aria-label="Sort and filter"
                        aria-expanded={!!sortOpen}
                        className={`w-12 h-full min-h-[46px] rounded-full border flex items-center justify-center shadow-sm transition duration-150 ${
                            sortOpen ? 'bg-brand border-brand text-slate-900' : 'bg-white border-gray-200 text-slate-600'
                        }`}
                    >
                        <SlidersHorizontal size={17} />
                    </button>

                    {sortOpen && onSortChange && (
                        <div className="absolute right-0 top-full mt-2 z-30 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                            <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                                Sort by
                            </p>
                            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                                <button
                                    key={k}
                                    onClick={() => onSortChange(k)}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition duration-150 ${
                                        sort === k ? 'bg-brand/15 font-bold text-slate-900' : 'text-slate-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {SORT_LABELS[k]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
