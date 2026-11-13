# API Contract — Countribus

Logical route families (plan §9). Implemented as Next.js Route Handlers and
Server Actions with typed, schema-validated (Zod) request/response. Naming is
adapted to App Router conventions; this lists the operations, not literal paths.

Principles: all mutations authenticate, authorise (server + RLS) and validate
input; never trust client-supplied price, role, `vendor_id`, payment status or
seat state; rate-limit auth, search, booking and webhook endpoints.

| Module                           | Operations                                                                                   | Access                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Auth**                         | register, login, logout, refresh, current-user                                               | public / self                                  |
| **Vendors**                      | list, create, update, submit-for-review, approve, suspend, staff mgmt                        | super_admin; vendor_owner (own)                |
| **Vehicles**                     | list, create, update, deactivate, seat-layout read/update, upload photos, assign to schedule | super_admin, vendor_owner, vendor_manager only |
| **Routes**                       | list, create, update, stops, terminal/location search                                        | manage: vendor_owner/manager; search: public   |
| **Schedules**                    | create, update, publish, cancel, assign vehicle, availability                                | vendor_owner/manager                           |
| **Search**                       | GET journey search (origin, destination, date, pax, category)                                | public                                         |
| **Seats**                        | GET seat map; POST hold; POST release; POST hold expiry/reconciliation                       | public (hold tied to session)                  |
| **Bookings**                     | create, retrieve by secure reference, cancel under policy, ticket, manifest                  | passenger (own); booking_officer               |
| **Passengers & luggage**         | passenger details, luggage declaration, tag generation, scan event                           | booking flow; staff for scans                  |
| **Payments**                     | initialize, provider webhook, status verification, refund request                            | server-only init; webhook public+signed        |
| **Operations**                   | ticket verify, passenger check-in, boarding confirmation, luggage scan                       | terminal_staff / luggage_officer (assigned)    |
| **Reports**                      | bookings, revenue, commission, vendor performance, manifests, exceptions                     | scoped by role + vendor                        |
| **Tickets** (Addendum)           | list own tickets, download PDF, request resend, view status                                  | customer (own)                                 |
| **Vendor manifests** (Addendum)  | list departures, passenger list, PDF/print, CSV export, luggage manifest                     | vendor staff (own vendor)                      |
| **Terminal manifest** (Addendum) | view assigned departure, scan QR, update boarding/luggage                                    | assigned terminal/shift only                   |

## Representative shapes

### `GET /api/search`

Query: `originTerminalId`, `destinationTerminalId`, `date` (YYYY-MM-DD),
`passengers` (int), `categoryKey?`. Returns schedules with vendor, departure/
arrival, `baseFareKobo`, `availableSeats`, policies.

### `POST /api/schedules/:id/holds`

Body: `{ seatIds: string[] }`. Server creates holds (target 10 min),
returns `{ holdId, expiresAt, seats }`. Fails if any seat not available.

### `POST /api/bookings`

Body: `{ holdId, passengers: [{ seatId, fullName, phone, email?, luggage: [...] }],
discountCode? }`. Server computes fare + luggage + discount (ignores any client
price), creates `pending_payment` booking + payment attempt, returns checkout.

### `POST /api/payments/webhook/:provider`

Signed provider callback. Verify signature → record `webhook_events`
(idempotent) → independently verify txn/amount → atomically confirm booking +
seats, compute commission, write ledger, generate tickets. Duplicate events are
no-ops. Returns 200 only after durable processing.

### `GET /api/bookings/:reference`

Secure opaque reference; returns booking + per-passenger tickets for the owner
only (no IDOR via sequential IDs).

All error responses use a consistent `{ error: { code, message, fieldErrors? } }`
envelope. Permission-denied returns 403 without leaking existence of other
tenants' resources.
