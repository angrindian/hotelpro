# HotelPro Architecture

## Architectural style
A modular monolith: one Express API with domain modules and one React application. This minimizes local development and deployment complexity while keeping clear boundaries for future extraction.

## Stack
- Frontend: React, TypeScript, Vite, Material UI, Axios, TanStack Query.
- Backend: Node.js, Express, TypeScript, Zod, Mongoose.
- Data: MongoDB; Mongo-backed express-session store.
- Security: bcrypt password hashing, opaque server-side sessions, HTTP-only cookie, Helmet, strict CORS, input validation, property authorization.
- Payment: mock provider only; future gateways should implement a payment adapter and server-verified webhooks.

## Trust boundaries
The browser is untrusted. Every write validates input and permissions on the API. Guest booking access is limited to the guest's own records. Hotel staff access is scoped to assigned `hotelIds`; admin is a platform role. Do not rely on client navigation or UI controls for authorization.

## Main API modules
- Auth: registration, login, logout, current user.
- Hotels: list active properties and admin creation.
- Rooms: property room listing, authorized room creation and status updates.
- Bookings: guest creation, role-scoped listing, mock payment, staff status updates.
- Analytics: aggregate reservation and paid revenue metrics.

## Session and deployment
Use Mongo-backed sessions; never rely on Express's in-memory store for deployment. Local development uses `COOKIE_SECURE=false` over localhost. Production must use HTTPS and Secure cookies. If frontend/API are cross-site, review SameSite, CORS, CSRF and proxy settings as one design. Explicit CSRF tokens and rate limiting are required before production.

## Booking consistency
Current code checks overlap before creating a booking but does not guarantee serializable inventory allocation under high concurrency. A production-ready implementation needs a transaction/locking/hold mechanism and idempotency keys, tested against the deployed MongoDB topology.
