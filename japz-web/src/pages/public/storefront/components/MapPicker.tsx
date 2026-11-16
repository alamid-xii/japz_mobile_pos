import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, LocateFixed, MapPin, Check } from 'lucide-react';

interface Props {
    /** Starting centre. Falls back to the store, then to Bongabong. */
    initialLat?: number | null;
    initialLng?: number | null;
    storeLat?: number | null;
    storeLng?: number | null;
    onConfirm: (lat: number, lng: number) => void;
    onClose: () => void;
}

const TILE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;

// --- Web Mercator, both directions ---------------------------------------
const lngToX = (lng: number, z: number) => ((lng + 180) / 360) * Math.pow(2, z);
const latToY = (lat: number, z: number) => {
    const r = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
};
const xToLng = (x: number, z: number) => (x / Math.pow(2, z)) * 360 - 180;
const yToLat = (y: number, z: number) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/**
 * Drag-to-position map picker.
 *
 * Uses the centre-pin pattern — the marker stays fixed in the middle and the
 * map moves under it — rather than tap-to-drop. On touch there is no reliable
 * way to tell a tap from the end of a drag, and a mis-read tap would silently
 * move someone's delivery address.
 *
 * Tiles come from OpenStreetMap: no API key, no mapping library.
 */
export default function MapPicker({
    initialLat, initialLng, storeLat, storeLng, onConfirm, onClose,
}: Props) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    // Start on the existing pin, else the store, else the town centre.
    const [center, setCenter] = useState({
        lat: initialLat ?? storeLat ?? 12.7464625,
        lng: initialLng ?? storeLng ?? 121.4855781,
    });
    const [zoom, setZoom] = useState(initialLat != null ? 17 : 15);
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;

        const measure = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            setSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
            return w > 0 && h > 0;
        };

        // A modal can mount inside a parent that is still zero-width (opening
        // transition, hidden ancestor). ResizeObserver does not always fire for
        // that first paint, so retry on animation frames until we get a real
        // size, then fall back to observing for later changes.
        let raf = 0;
        let tries = 0;
        const settle = () => {
            if (measure() || tries++ > 60) return;
            raf = requestAnimationFrame(settle);
        };
        settle();

        const ro = new ResizeObserver(measure);
        ro.observe(el);
        window.addEventListener('resize', measure);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // --- dragging ---------------------------------------------------------
    const drag = useRef<{ x: number; y: number } | null>(null);

    const panBy = useCallback((dx: number, dy: number) => {
        setCenter(c => {
            const cx = lngToX(c.lng, zoom) * TILE - dx;
            const cy = latToY(c.lat, zoom) * TILE - dy;
            const lat = yToLat(cy / TILE, zoom);
            const lng = xToLng(cx / TILE, zoom);
            // Clamp to valid Mercator range so the map cannot be dragged off world.
            return {
                lat: Math.max(-85, Math.min(85, lat)),
                lng: ((lng + 180) % 360 + 360) % 360 - 180,
            };
        });
    }, [zoom]);

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        const dy = e.clientY - drag.current.y;
        drag.current = { x: e.clientX, y: e.clientY };
        panBy(dx, dy);
    };
    const endDrag = () => { drag.current = null; };

    const useMyLocation = () => {
        setLocateError(null);
        if (!navigator.geolocation) { setLocateError('Your browser cannot share a location.'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setZoom(18);
                setLocating(false);
            },
            err => {
                setLocateError(err.code === err.PERMISSION_DENIED
                    ? 'Location permission denied. Drag the map instead.'
                    : 'Could not get your location. Drag the map instead.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    };

    // --- tiles ------------------------------------------------------------
    const originX = lngToX(center.lng, zoom) * TILE - size.w / 2;
    const originY = latToY(center.lat, zoom) * TILE - size.h / 2;

    const tiles: { key: string; src: string; left: number; top: number }[] = [];
    if (size.w > 0 && size.h > 0) {
        const maxIndex = Math.pow(2, zoom);
        for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + size.w) / TILE); tx++) {
            for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + size.h) / TILE); ty++) {
                if (ty < 0 || ty >= maxIndex) continue;
                const wrapped = ((tx % maxIndex) + maxIndex) % maxIndex;
                tiles.push({
                    key: `${zoom}/${tx}/${ty}`,
                    src: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`,
                    left: tx * TILE - originX,
                    top: ty * TILE - originY,
                });
            }
        }
    }

    const zoomBtn = 'w-9 h-9 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center active:scale-90 transition duration-150 disabled:opacity-40';

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
                    <div className="min-w-0">
                        <p className="font-extrabold text-slate-900">Pin your location</p>
                        <p className="text-[11px] text-slate-500">Drag the map to move the pin</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-gray-100">
                        <X size={18} className="text-slate-600" />
                    </button>
                </div>

                <div
                    ref={boxRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="relative bg-gray-100 h-[320px] sm:h-[380px] shrink-0 cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden"
                >
                    {tiles.map(t => (
                        <img
                            key={t.key}
                            src={t.src}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            decoding="async"
                            className="absolute max-w-none pointer-events-none"
                            style={{ left: t.left, top: t.top, width: TILE, height: TILE }}
                        />
                    ))}

                    {/* Fixed centre pin. Sits above the tiles and ignores pointers
                        so it never interrupts a drag. */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center -mt-5">
                            <MapPin size={38} className="text-slate-900 drop-shadow-lg" fill="#FFCE1B" strokeWidth={2} />
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-900/25 -mt-1.5" />
                        </div>
                    </div>

                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                        <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 1))} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className={zoomBtn}>
                            <Plus size={17} />
                        </button>
                        <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 1))} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className={zoomBtn}>
                            <Minus size={17} />
                        </button>
                    </div>

                    <button
                        onClick={useMyLocation}
                        disabled={locating}
                        aria-label="Centre on my location"
                        className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center active:scale-90 transition duration-150"
                    >
                        <LocateFixed size={17} className={locating ? 'animate-pulse' : ''} />
                    </button>

                    <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={e => e.stopPropagation()}
                        className="absolute bottom-1 left-1 bg-white/80 text-[9px] text-slate-600 px-1.5 py-0.5 rounded"
                    >
                        © OpenStreetMap
                    </a>
                </div>

                <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 space-y-2">
                    {locateError && <p className="text-[11px] text-amber-700">{locateError}</p>}
                    <p className="text-[11px] text-slate-400 font-mono">
                        {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                    </p>
                    <button
                        onClick={() => onConfirm(center.lat, center.lng)}
                        className="w-full bg-brand text-slate-900 font-extrabold rounded-full py-3.5 shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition duration-150"
                    >
                        <Check size={17} /> Use this location
                    </button>
                </div>
            </div>
        </div>
    );
}
