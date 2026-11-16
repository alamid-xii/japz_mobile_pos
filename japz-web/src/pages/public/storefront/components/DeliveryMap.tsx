import { useEffect, useRef, useState } from 'react';
import { MapPin, Store, ExternalLink, Route as RouteIcon } from 'lucide-react';
import { publicOrderAPI } from '../../../../services/api';

interface Props {
    lat: number;
    lng: number;
    storeLat?: number | null;
    storeLng?: number | null;
    label?: string;
    /** Name for the origin marker. Defaults to the restaurant. */
    originLabel?: string;
    /** Live origin: re-routes as it changes, for a rider en route. */
    liveOrigin?: boolean;
}

const TILE = 256;
const HEIGHT = 240;

// --- Web Mercator projection ---------------------------------------------
const lngToX = (lng: number, z: number) => ((lng + 180) / 360) * Math.pow(2, z);
const latToY = (lat: number, z: number) => {
    const r = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
};

/** Straight-line ground distance in km. */
const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(s));
};

/**
 * Delivery map rendered from OpenStreetMap raster tiles with an SVG overlay, so
 * a line can be drawn between the store and the customer. No API key and no
 * mapping library.
 *
 * The line is the STRAIGHT-LINE path, not a driving route — there is no routing
 * engine here, so it shows direction and distance, nothing more. And it is not
 * a rider's position: nothing in this system reports where a rider is.
 */
export default function DeliveryMap({
    lat, lng, storeLat, storeLng, label,
    originLabel = 'JAPZ Grill', liveOrigin = false,
}: Props) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const measure = () => setWidth(el.clientWidth);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const hasStore = storeLat != null && storeLng != null;

    // Road route between the store and the drop-off. If routing is unavailable
    // the map falls back to a straight line, and the caption says which it is.
    const [route, setRoute] = useState<{ points: [number, number][]; km: number; mins: number } | null>(null);
    const [routeTried, setRouteTried] = useState(false);

    useEffect(() => {
        if (!hasStore) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await publicOrderAPI.route(storeLat!, storeLng!, lat, lng);
                if (cancelled) return;
                const pts = res.data?.points;
                if (Array.isArray(pts) && pts.length > 1) {
                    setRoute({
                        points: pts,
                        km: (res.data.distanceMeters || 0) / 1000,
                        mins: Math.round((res.data.durationSeconds || 0) / 60),
                    });
                }
            } catch {
                // Straight-line fallback; not an error the customer needs to see.
            } finally {
                if (!cancelled) setRouteTried(true);
            }
        })();
        return () => { cancelled = true; };
        // A live origin moves constantly; rounding the dependency to ~4dp
        // (about 11 m) stops every GPS jitter triggering a new route lookup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasStore, liveOrigin ? storeLat?.toFixed(3) : storeLat, liveOrigin ? storeLng?.toFixed(3) : storeLng, lat, lng]);

    // Everything that must stay on screen: the endpoints, plus the route when we
    // have one, so a curving road is not clipped at the edges.
    const fitPoints: [number, number][] = hasStore
        ? (route ? route.points : [[storeLat!, storeLng!], [lat, lng]])
        : [[lat, lng]];

    const minLat = Math.min(...fitPoints.map(p => p[0]));
    const maxLat = Math.max(...fitPoints.map(p => p[0]));
    const minLng = Math.min(...fitPoints.map(p => p[1]));
    const maxLng = Math.max(...fitPoints.map(p => p[1]));

    let zoom = 16;
    if (hasStore && width > 0) {
        const pad = 56;
        for (let z = 18; z >= 2; z--) {
            const dx = Math.abs(lngToX(maxLng, z) - lngToX(minLng, z)) * TILE;
            const dy = Math.abs(latToY(minLat, z) - latToY(maxLat, z)) * TILE;
            if (dx <= width - pad * 2 && dy <= HEIGHT - pad * 2) { zoom = z; break; }
        }
    }

    const centerLat = hasStore ? (minLat + maxLat) / 2 : lat;
    const centerLng = hasStore ? (minLng + maxLng) / 2 : lng;

    // World-pixel origin of the visible viewport.
    const originX = lngToX(centerLng, zoom) * TILE - width / 2;
    const originY = latToY(centerLat, zoom) * TILE - HEIGHT / 2;

    const toScreen = (la: number, ln: number) => ({
        x: lngToX(ln, zoom) * TILE - originX,
        y: latToY(la, zoom) * TILE - originY,
    });

    const tiles: { key: string; src: string; left: number; top: number }[] = [];
    if (width > 0) {
        const maxIndex = Math.pow(2, zoom);
        const xStart = Math.floor(originX / TILE);
        const xEnd = Math.floor((originX + width) / TILE);
        const yStart = Math.floor(originY / TILE);
        const yEnd = Math.floor((originY + HEIGHT) / TILE);
        for (let tx = xStart; tx <= xEnd; tx++) {
            for (let ty = yStart; ty <= yEnd; ty++) {
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

    const cust = toScreen(lat, lng);
    const store = hasStore ? toScreen(storeLat!, storeLng!) : null;
    const km = hasStore ? haversineKm(storeLat!, storeLng!, lat, lng) : null;

    const openFull = hasStore
        ? `https://www.openstreetmap.org/directions?from=${storeLat}%2C${storeLng}&to=${lat}%2C${lng}`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

    return (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div ref={boxRef} className="relative bg-gray-100 overflow-hidden" style={{ height: HEIGHT }}>
                {tiles.map(t => (
                    <img
                        key={t.key}
                        src={t.src}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        // Not lazy: these tiles ARE the map, and deferring them
                        // leaves the customer looking at an empty grey box.
                        decoding="async"
                        className="absolute select-none max-w-none"
                        style={{ left: t.left, top: t.top, width: TILE, height: TILE }}
                    />
                ))}

                {width > 0 && (
                    <svg className="absolute inset-0 pointer-events-none" width={width} height={HEIGHT}>
                        {store && route && (() => {
                            // Solid polyline following the actual street geometry.
                            const d = route.points
                                .map(([la, ln], i) => {
                                    const pt = toScreen(la, ln);
                                    return (i === 0 ? 'M' : 'L') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
                                })
                                .join(' ');
                            return (
                                <>
                                    <path d={d} fill="none" stroke="white" strokeWidth={8}
                                        strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                                    <path d={d} fill="none" stroke="#111827" strokeWidth={4}
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </>
                            );
                        })()}

                        {store && !route && (
                            <>
                                {/* No route available: dashed straight line, so the
                                    difference from a real road path stays obvious. */}
                                <line
                                    x1={store.x} y1={store.y} x2={cust.x} y2={cust.y}
                                    stroke="white" strokeWidth={7} strokeLinecap="round" opacity={0.9}
                                />
                                <line
                                    x1={store.x} y1={store.y} x2={cust.x} y2={cust.y}
                                    stroke="#111827" strokeWidth={3} strokeLinecap="round"
                                    strokeDasharray="8 6"
                                />
                            </>
                        )}

                        {store && (
                            <g>
                                <circle cx={store.x} cy={store.y} r={11} fill="#111827" stroke="white" strokeWidth={3} />
                                <circle cx={store.x} cy={store.y} r={3.5} fill="#FFCE1B" />
                            </g>
                        )}

                        <g>
                            <circle cx={cust.x} cy={cust.y} r={11} fill="#FFCE1B" stroke="white" strokeWidth={3} />
                            <circle cx={cust.x} cy={cust.y} r={3.5} fill="#111827" />
                        </g>
                    </svg>
                )}

                {/* OpenStreetMap requires visible attribution for its tiles. */}
                <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="absolute bottom-1 right-1 bg-white/80 text-[9px] text-gray-600 px-1.5 py-0.5 rounded"
                >
                    © OpenStreetMap
                </a>
            </div>

            <div className="p-4 space-y-2">
                {hasStore && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                            <Store size={11} className="text-brand" />
                        </span>
                        <span className="font-bold text-slate-900">{originLabel}</span>
                        {route ? (
                            <span className="text-slate-400 flex items-center gap-1">
                                · <RouteIcon size={11} />
                                {route.km < 1 ? `${Math.round(route.km * 1000)} m` : `${route.km.toFixed(1)} km`} by road
                                {route.mins > 0 ? ` · ~${route.mins} min drive` : ''}
                            </span>
                        ) : km != null ? (
                            <span className="text-slate-400">
                                · {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away
                            </span>
                        ) : null}
                    </div>
                )}

                <div className="flex items-start gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
                        <MapPin size={11} className="text-gray-900" />
                    </span>
                    <div className="min-w-0">
                        <span className="font-bold text-gray-900">Delivering to</span>
                        {label && <p className="text-gray-500 break-words mt-0.5">{label}</p>}
                    </div>
                </div>

                <a
                    href={openFull}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 underline underline-offset-4"
                >
                    {hasStore ? 'Get directions' : 'Open in maps'} <ExternalLink size={11} />
                </a>

                {hasStore && routeTried && !route && (
                    <p className="text-[10px] text-slate-400">
                        Straight-line distance — no road route was available for this spot.
                    </p>
                )}
            </div>
        </section>
    );
}
