/** Universal Google Maps links open navigation without an API key. */
export function googleMapsSearchUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({ api: '1', query: `${lat},${lng}` });
  return `https://www.google.com/maps/search/?${params}`;
}

export function googleMapsDirectionsUrl(lat: number, lng: number, origin?: { lat: number; lng: number }): string {
  const params = new URLSearchParams({
    api: '1', destination: `${lat},${lng}`, travelmode: 'driving', dir_action: 'navigate',
  });
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
    && Math.abs(origin.lat) <= 90 && Math.abs(origin.lng) <= 180) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params}`;
}
