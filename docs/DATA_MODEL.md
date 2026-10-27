# Data Model

- **User**: name, normalized unique email, password hash, platform role, active flag and optional property memberships. Password hash is excluded from normal queries.
- **Hotel**: name, unique slug, city/country, timezone, currency, active flag.
- **Room**: hotel reference, room number unique within hotel, room type, capacity, nightly price, operational status and amenities.
- **Booking**: unique public booking code, hotel/room/guest references, check-in/out, guests, total amount/currency snapshot, booking status and payment status.
- **Payment**: booking reference, mock provider, amount/currency, state and unique mock reference. Never stores card data.
- **AuditEvent**: actor, property scope, action, target and structured metadata.
- **Session**: persistent session document managed by connect-mongo.

Indexes exist on user email, hotel slug, hotel+room number, booking code, room/date/status, payment booking reference and audit timestamps via Mongoose defaults.

## Date semantics
A stay occupies nights in the half-open interval `[checkIn, checkOut)`. Overlap exists when `existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn`. Check-out must be later than check-in. All client date values must be validated server-side.

## Important production design note
The current overlap check is a useful baseline but can race under concurrent writes. Production booking must serialize inventory allocation or use a transaction-backed reservation/hold design with expiration and idempotency. Validate the exact strategy against the selected MongoDB topology.
