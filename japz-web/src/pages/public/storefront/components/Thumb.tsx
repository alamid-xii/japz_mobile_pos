import { UtensilsCrossed } from 'lucide-react';
import { fallbackTint } from '../../../../utils/menuImages';

/** Product photo, or a warm branded tile when no image exists for it yet. */
export default function Thumb({ src, seed, name, className = '', eager = false }: {
    src: string | null; seed: number; name: string; className?: string; eager?: boolean;
}) {
    if (src) {
        return (
            <img
                src={src}
                alt={name}
                // Above-the-fold imagery (the hero) must not be deferred.
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                className={`object-cover w-full h-full ${className}`}
            />
        );
    }
    return (
        <div className={`w-full h-full bg-gradient-to-br ${fallbackTint(seed)} flex items-center justify-center`}>
            <UtensilsCrossed className="text-white/70" size={26} />
        </div>
    );
}
