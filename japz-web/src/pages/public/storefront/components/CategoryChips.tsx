import {
    UtensilsCrossed, Beef, Sandwich, Wheat, Popcorn, CupSoda, IceCream, Coffee,
    type LucideIcon,
} from 'lucide-react';
import type { Category } from '../StorefrontContext';

/** Matches a category name to an icon; unknown names fall back to cutlery. */
const iconFor = (name: string): LucideIcon => {
    const n = name.trim().toLowerCase();
    if (n.includes('burger')) return Beef;
    if (n.includes('sandwich')) return Sandwich;
    if (n.includes('pasta')) return Wheat;
    if (n.includes('fries') || n.includes('chip')) return Popcorn;
    if (n.includes('beverage')) return CupSoda;
    if (n.includes('cooler')) return IceCream;
    if (n.includes('coffee')) return Coffee;
    return UtensilsCrossed;
};

interface Props {
    categories: Category[];
    activeId: number | null;
    onSelect: (id: number | null) => void;
}

export default function CategoryChips({ categories, activeId, onSelect }: Props) {
    const chip = (active: boolean) =>
        `shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition duration-150 ${
            active
                ? 'bg-brand text-slate-900 shadow-sm'
                : 'bg-white text-slate-500 border border-gray-200 hover:border-gray-300'
        }`;

    return (
        // The rail scrolls; the page never does.
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 w-max pb-0.5">
                <button onClick={() => onSelect(null)} aria-pressed={activeId === null} className={chip(activeId === null)}>
                    <UtensilsCrossed size={14} /> All
                </button>
                {categories.map(c => {
                    const Icon = iconFor(c.name);
                    const active = activeId === c.id;
                    return (
                        <button key={c.id} onClick={() => onSelect(c.id)} aria-pressed={active} className={chip(active)}>
                            <Icon size={14} /> {c.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
