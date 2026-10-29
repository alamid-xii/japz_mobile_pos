# Japz reservation integration

See [README.md](./README.md) for current setup and hosting instructions.

The frontend calls the Express reservation API through japz-web/src/services/reservations.ts. Set VITE_API_URL for a separately hosted backend. Both booking availability and submissions are validated on the server; reservations are stored in MySQL.

The former POS API and staff registration endpoints have been removed. Existing approved admin accounts manage bookings at /admin/reservations. Guests book at /reserve and retrieve their bookings at /manage without registering.
