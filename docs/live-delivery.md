# Live delivery, private proofs and cashier notifications

## Customer and rider flow

The cashier's **Ready for pickup** link shows a small red count for orders whose items are all ready and which still need cashier handover. Assigned deliveries are excluded. The count refreshes every five seconds, on focus/reconnection, and immediately after handover actions in the same tab. It remains visible in collapsed and mobile navigation, and has a screen-reader description.

When a rider starts a delivery, the app requests location permission and starts sharing. Existing in-progress deliveries have a **Share live location** button. **Pause sharing** clears the server snapshot. The page takes fresh GPS samples approximately every ten seconds, limits duplicate uploads and shares only with customers whose active delivery is assigned to that rider. Leaving the page, backgrounding it, pausing or completing the delivery stops sharing. Resume needs a fresh sample after the prior stop has reached the server. Permission failures never claim that sharing is live.

Browser location needs HTTPS or localhost. The rider must keep the app open in the foreground; a locked phone, suspended browser or lost GPS/network connection can interrupt it. This is not a background native tracking service. Customers see a blue rider marker, capture time and accuracy. Samples expire after 90 seconds, and stale/unavailable coordinates are hidden. Customer polling runs every five seconds. A temporary connection loss retains order details and hides the live marker until fresh updates recover. The configured delivery-time estimate remains independent of GPS.

The customer map appears immediately below the order header, above GPS status and delivery-time estimates. It remains visible while GPS is unavailable. An address without a saved coordinate pin shows an explanation and a keyless Google Maps address-search link rather than silently removing the map area.

## Free maps and Google navigation

The default live map continues to use OpenStreetMap with visible attribution. Google Maps navigation and rider-location links use official **Maps URLs**, which require no key. No Google billing account or paid Maps API is used by default.

An optional `VITE_GOOGLE_MAPS_EMBED_API_KEY` can enable a separate Google Embed map in a later deployment. It is blank in `.env.example`. Google states Embed requests have no usage charge, but its setup requires an API key and billing-enabled Cloud project. Restrict such a key to Maps Embed API and the website domains. The map offers **Use free map** to return to OpenStreetMap. No Google Directions, Routes or Maps JavaScript APIs are enabled by this change.

Official references: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Embed setup and costs](https://developers.google.com/maps/documentation/embed/quickstart), [Embed billing](https://developers.google.com/maps/documentation/embed/usage-and-billing).

## Proof storage and setup

New JPEG, PNG and WebP proofs up to 6 MB are validated and stored as database BLOBs with MIME type, size and SHA-256. Completing the delivery and saving its proof are one transaction. Nothing is written to `public/uploads/pod` for new proofs. Lists do not select or serialize binary photo data.

Proof viewing uses a private bearer-authenticated endpoint, then a temporary browser object URL. Riders can view their own deliveries; cashier/admin and the customer who owns the order can view the permitted proofs. Customer views use the customer token even when a staff session also exists. The old public POD download path is blocked. Original files are preserved and can be imported safely; no file deletion is part of this change.

The confirmed local database already has all 11 delivery storage/tracking columns. The local proof import added no schema columns and copied five existing legacy photos into the database. Their original delivery rows, files and verified photo hashes were preserved. Three historical proof references still have no original file, so those photos could not be imported or reconstructed.

A protected backup was retained at `japz-backend/.local/backups/delivery-before-database-proofs-1794887897540.json`. It is local private data and must remain outside source control and public downloads. Future environments still need the delivery-only additive migration wherever the 11 columns are missing. Migration, backup, read-only preflight and legacy-import instructions are in [the backend setup guide](../japz-backend/DELIVERY_TRACKING.md).

## Changed modules

- Backend delivery model, routes, public tracking serialization and inventory status guard.
- New backend location/photo validation, private-file guard, additive migration, read-only preflight and safe legacy importer.
- Frontend rider deliveries, location-sharing hook, customer tracking card and map, delivery estimate and private proof/receipt viewer.
- Shared API methods and Google Maps URL helpers.
- Cashier layout, shared sidebar and notification styles.
- Focused backend tests and `delivery-live.spec.ts` / `cashier-ready-badge.spec.ts` browser tests.

No payroll, attendance, reservation schema or scheduling changes are included.
