import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bike, MapPin, Store, ExternalLink, Route as RouteIcon } from 'lucide-react';
import { publicOrderAPI } from '../../../../services/api';
import { googleMapsDirectionsUrl } from '../../../../utils/googleMaps';

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
    originKind?: 'store' | 'rider';
}

const TILE = 256;
const HEIGHT = 240;
const MERCATOR_MAX_LAT = 85.05112878;
const GOOGLE_EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY?.trim();
const validCoordinates = (lat: unknown, lng: unknown) =>
    typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// --- Web Mercator projection ---------------------------------------------
const lngToX = (lng: number, z: number) => ((lng + 180) / 360) * Math.pow(2, z);
const latToY = (lat: number, z: number) => {
    const r = (Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat)) * Math.PI) / 180;
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
    return R * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, s))));
};

/**
 * The default map uses OpenStreetMap tiles and the existing road-route service.
 * A live origin marks the rider's latest reported position. Google Embed is an
 * optional, separate provider; its directions are never drawn on the free map.
 */
export default function DeliveryMap(props: Props) {
    const [preferFree, setPreferFree] = useState(false);
    const [googleFailed, setGoogleFailed] = useState(false);
    const { lat, lng, storeLat, storeLng, label, liveOrigin, originKind, originLabel } = props;
    const hasOrigin = validCoordinates(storeLat, storeLng);
    const isRider = originKind === 'rider' || liveOrigin;
    const originName = originLabel || (isRider ? 'Rider location' : 'JAPZ Grill');

    if (!validCoordinates(lat, lng)) {
        return <section className="bg-white rounded-2xl border border-gray-100 p-4 text-xs text-gray-500">A delivery map is not available for this location.</section>;
    }

    const showGoogle = Boolean(GOOGLE_EMBED_KEY && !preferFree && !googleFailed);
    if (!showGoogle) {
        return <FreeDeliveryMap {...props} originLabel={originName}
            storeLat={hasOrigin ? storeLat : undefined} storeLng={hasOrigin ? storeLng : undefined}
            providerControls={GOOGLE_EMBED_KEY && !googleFailed ? <button type="button" onClick={() => setPreferFree(false)} className="text-[11px] font-bold text-gray-500 underline underline-offset-4">Use Google map</button> : undefined} />;
    }

    const params = new URLSearchParams({ key: GOOGLE_EMBED_KEY! });
    if (hasOrigin) {
        params.set('origin', `${storeLat},${storeLng}`);
        params.set('destination', `${lat},${lng}`);
        params.set('mode', 'driving');
    } else params.set('q', `${lat},${lng}`);
    const embedUrl = `https://www.google.com/maps/embed/v1/${hasOrigin ? 'directions' : 'place'}?${params}`;

    return <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <iframe title={hasOrigin ? `Delivery directions from ${originName}` : 'Delivery destination map'}
            src={embedUrl} width="100%" height={HEIGHT} style={{ border: 0, display: 'block', minWidth: 200 }}
            referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" onError={() => setGoogleFailed(true)} />
        <div className="p-4 space-y-2 text-xs">
            {hasOrigin && <div className="flex items-center gap-2 font-bold text-slate-900">{isRider ? <Bike size={16} className="text-blue-600" /> : <Store size={16} />}<span>{originName} · origin A</span></div>}
            <div className="flex items-start gap-2"><MapPin size={16} className="shrink-0" /><div><strong>Delivering to</strong>{label && <p className="text-gray-500 break-words mt-0.5">{label}</p>}</div></div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <a href={googleMapsDirectionsUrl(lat, lng, hasOrigin ? { lat: storeLat!, lng: storeLng! } : undefined)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 underline underline-offset-4">Navigate with Google Maps <ExternalLink size={11} /></a>
                <button type="button" onClick={() => setPreferFree(true)} className="text-[11px] font-bold text-gray-500 underline underline-offset-4">Use free map</button>
            </div>
        </div>
    </section>;
}

interface RouteData { points: [number, number][]; km: number; mins: number }

function FreeDeliveryMap({
    lat, lng, storeLat, storeLng, label,
    originLabel = 'JAPZ Grill', liveOrigin = false, originKind, providerControls,
}: Props & { providerControls?: ReactNode }) {
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

    const hasStore = validCoordinates(storeLat, storeLng);
    const isRider = originKind === 'rider' || liveOrigin;
    // About 110 m: keep the marker precise, but avoid re-routing for GPS jitter.
    const routeOriginLat = hasStore ? (liveOrigin ? Number(storeLat!.toFixed(3)) : storeLat!) : null;
    const routeOriginLng = hasStore ? (liveOrigin ? Number(storeLng!.toFixed(3)) : storeLng!) : null;
    const routeKey = hasStore ? `${routeOriginLat},${routeOriginLng}:${lat},${lng}` : '';

    // Road route between the store and the drop-off. If routing is unavailable
    // the map falls back to a straight line, and the caption says which it is.
    const [routeResult, setRouteResult] = useState<{ key: string; route: RouteData | null }>({ key: '', route: null });
    // A result belongs to its coordinates. A changed destination or rider cell
    // immediately hides an earlier route, including while the new lookup runs.
    const route = routeKey && routeResult.key === routeKey ? routeResult.route : null;
    const routeTried = Boolean(routeKey && routeResult.key === routeKey);

    useEffect(() => {
        if (routeOriginLat == null || routeOriginLng == null) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await publicOrderAPI.route(routeOriginLat, routeOriginLng, lat, lng);
                if (cancelled) return;
                const pts = res.data?.points;
                const distance = Number(res.data?.distanceMeters), duration = Number(res.data?.durationSeconds);
                const validRoute = Array.isArray(pts) && pts.length > 1
                    && pts.every(point => Array.isArray(point) && validCoordinates(point[0], point[1]))
                    && Number.isFinite(distance) && distance >= 0 && Number.isFinite(duration) && duration >= 0;
                setRouteResult({ key: routeKey, route: validRoute ? {
                    points: pts, km: distance / 1000, mins: Math.round(duration / 60),
                } : null });
            } catch {
                // Straight-line fallback; not an error the customer needs to see.
                if (!cancelled) setRouteResult({ key: routeKey, route: null });
            }
        })();
        return () => { cancelled = true; };
    }, [routeOriginLat, routeOriginLng, routeKey, lat, lng]);

    // Everything that must stay on screen: the endpoints, plus the route when we
    // have one, so a curving road is not clipped at the edges.
    const fitPoints: [number, number][] = route ? route.points.concat([[lat, lng]]) : [[lat, lng]];
    if (hasStore) fitPoints.push([storeLat!, storeLng!]);

    // Keep longitude near the destination, so a short antimeridian crossing
    // fits across the map instead of stretching across the whole world.
    const unwrapLng = (value: number) => lng + (((value - lng + 180) % 360 + 360) % 360 - 180);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [pointLat, pointLng] of fitPoints) {
        const x = lngToX(unwrapLng(pointLng), 0), y = latToY(pointLat, 0);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }

    let zoom = 16;
    if (hasStore && width > 0) {
        const pad = 56;
        zoom = 0;
        for (let z = 18; z >= 0; z--) {
            const dx = (maxX - minX) * Math.pow(2, z) * TILE;
            const dy = (maxY - minY) * Math.pow(2, z) * TILE;
            if (dx <= width - pad * 2 && dy <= HEIGHT - pad * 2) { zoom = z; break; }
        }
    }

    // World-pixel origin of the visible viewport.
    const scale = Math.pow(2, zoom) * TILE;
    const originX = (minX + maxX) / 2 * scale - width / 2;
    const originY = (minY + maxY) / 2 * scale - HEIGHT / 2;

    const toScreen = (la: number, ln: number) => ({
        x: lngToX(unwrapLng(ln), zoom) * TILE - originX,
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
                    <svg className="absolute inset-0 pointer-events-none" width={width} height={HEIGHT} role="img" aria-label={hasStore ? `Map from ${originLabel} to delivery destination` : 'Delivery destination map'}>
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
                            <g role="img" aria-label={isRider ? 'Rider location' : originLabel}>
                                <circle cx={store.x} cy={store.y} r={isRider ? 14 : 11} fill={isRider ? '#2563eb' : '#111827'} stroke="white" strokeWidth={3} />
                                {isRider ? <Bike x={store.x - 9} y={store.y - 9} width={18} height={18} stroke="white" strokeWidth={2} aria-hidden="true" /> : <circle cx={store.x} cy={store.y} r={3.5} fill="#FFCE1B" />}
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
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isRider ? 'bg-blue-600' : 'bg-gray-900'}`}>
                            {isRider ? <Bike size={12} className="text-white" /> : <Store size={11} className="text-brand" />}
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

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <a href={googleMapsDirectionsUrl(lat, lng, hasStore ? { lat: storeLat!, lng: storeLng! } : undefined)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 underline underline-offset-4">Navigate with Google Maps <ExternalLink size={11} /></a>
                    <a href={openFull} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 underline underline-offset-4">Open free map <ExternalLink size={11} /></a>
                    {providerControls}
                </div>

                {hasStore && routeTried && !route && (
                    <p className="text-[10px] text-slate-400">
                        Straight-line distance — no road route was available for this spot.
                    </p>
                )}
            </div>
        </section>
    );
}
