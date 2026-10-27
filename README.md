# HotelPro — Multi-property Hotel Management System

HotelPro is a portfolio-oriented MERN application starter with React + TypeScript + Material UI, Express, MongoDB/Mongoose, server-side sessions and a mock payment workflow. It supports guest registration, demo admin login, multi-property hotel records, room inventory, reservations, simulated payments, staff booking status updates and a basic analytics summary.

> **Development/demo only:** payment processing is simulated. Do not use the seeded password in production. The application is not a certified production hotel or payment system.

## Requirements
- Node.js 22 LTS or newer supported LTS; npm is bundled with Node.js.
- MongoDB Community Server running locally, or a MongoDB Atlas connection string.
- VS Code recommended.

## Exact Windows setup
1. Install Node.js LTS from https://nodejs.org/en/download/ and MongoDB Community Server from https://www.mongodb.com/try/download/community. During MongoDB setup, choose to install it as a Windows service. MongoDB Compass is useful but optional.
2. Open a **new** PowerShell window and run `node -v` and `npm -v`. If either is not recognized, restart the terminal (or computer) and check PATH.
3. Extract the `hotelpro-phase1.zip` archive to a folder such as `D:\Projects\hotelpro-phase1`.
4. Open that extracted folder in VS Code: **File → Open Folder**.
5. In VS Code choose **Terminal → New Terminal**. Confirm the terminal is at the folder containing the root `package.json`.
6. Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI` to `mongodb://127.0.0.1:27017/hotelpro`. Replace `SESSION_SECRET` with a random secret of 32+ characters. For local-only development keep `COOKIE_SECURE=false`.
7. Run `npm install` from the project root.
8. Ensure the MongoDB service is running (Windows Services → MongoDB → Start, if needed).
9. Seed the demo hotel and rooms: `npm run seed -w backend`. This creates demo admin `admin@hotelpro.local` with password `ChangeMe123!`. Change this behavior before production use.
10. Start both services: `npm run dev`.
11. Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/api/health`.
12. Sign in with the demo admin credentials above. Use the Rooms page to inspect inventory, Reservations to create a booking and simulate payment, and Analytics to view summary values.

## Useful commands
- `npm run dev` — start frontend and backend.
- `npm run dev:api` — backend only.
- `npm run dev:web` — frontend only.
- `npm run seed -w backend` — seed demo records.
- `npm run typecheck` — run TypeScript checks.
- `npm run build` — create production builds.
- `npm test` — run configured test scripts (add/expand tests as features mature).

## Troubleshooting
- **`npm` is not recognized:** install Node.js LTS and reopen PowerShell/VS Code.
- **MongoDB connection error:** start the MongoDB service or verify the Atlas URI and network access rules.
- **Missing environment variable:** ensure `backend/.env` exists and `SESSION_SECRET` has at least 32 characters.
- **Frontend cannot reach API:** keep backend on port 4000 and frontend on 5173, and ensure `CLIENT_ORIGIN` matches the frontend URL.
- **Port already in use:** stop the process using that port or change `PORT` and the frontend API URL consistently.

## Project structure
- `backend/src/models` — Mongoose models.
- `backend/src/routes.ts` — API endpoints and business workflows.
- `backend/src/middleware` — authentication and authorization helpers.
- `backend/src/seed.ts` — local demo data.
- `frontend/src/app/App.tsx` — responsive application workspace.
- `docs/` — architecture, data model and acceptance criteria.

## API overview
- `GET /api/health`
- `GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/hotels`, `POST /api/hotels` (admin)
- `GET /api/hotels/:hotelId/rooms`, `POST /api/rooms`, `PATCH /api/rooms/:roomId/status`
- `GET /api/bookings`, `POST /api/bookings`, `POST /api/bookings/:bookingId/mock-payment`, `PATCH /api/bookings/:bookingId/status`
- `GET /api/analytics/summary` (admin/manager)

## Known limitations and next hardening tasks
- Booking overlap checks need a stronger concurrency strategy (transaction/lock or a dedicated inventory reservation design) before production traffic.
- Implement explicit CSRF tokens in addition to origin checks and SameSite cookies.
- Add tests for authentication, tenant isolation, booking conflicts, idempotency and payment state transitions.
- Add rate limiting, password reset/email verification, audit coverage, booking cancellation/refund policy, real housekeeping tasks, invoices, notifications and accessibility/E2E tests.
- Never expose a production database directly to the public internet; use TLS, secrets management, backups and least-privilege database credentials.
