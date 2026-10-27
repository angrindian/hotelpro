# Acceptance Criteria

## Phase 1 — Application implementation
- [ ] User can register and log in; passwords are hashed and session IDs rotate on login.
- [ ] API rejects unauthenticated access to protected endpoints.
- [ ] Platform admin and property-scoped staff have different access boundaries.
- [ ] Admin can view/create hotel records; rooms can be listed and managed by authorized property staff.
- [ ] Guest can create a reservation for valid future dates and capacity.
- [ ] Overlapping reservations are rejected by the API.
- [ ] Mock payment success confirms a booking; failure leaves it unpaid.
- [ ] Staff can check guests in/out only for properties they are assigned to.
- [ ] Analytics returns property-scoped counts and paid revenue.
- [ ] UI reports API errors and works at desktop and mobile widths.

## Phase 2 — Verification and deployment readiness
- [ ] Clean install from documented instructions succeeds on Windows.
- [ ] Backend and frontend typecheck/build pass.
- [ ] Automated tests cover auth, permissions, booking conflicts and mock payments.
- [ ] CSRF tokens and rate limiting are implemented and tested.
- [ ] No secrets are committed; production cookies use Secure and HTTPS.
- [ ] Deployment config, backup/restore procedure, logging and health checks are documented.

A checked item means it was actually verified; architecture intentions alone do not count as passing tests.
