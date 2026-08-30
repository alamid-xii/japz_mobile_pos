/** Placeholder tile shown while the menu loads, so the grid fills in rather than blinks. */
export default function SkeletonCard() {
    return (
        <div className="w-full bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="w-full aspect-[4/3] bg-gray-100" />
            <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-1/3 mt-2" />
            </div>
        </div>
    );
}
