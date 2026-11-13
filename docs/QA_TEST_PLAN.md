# QA & Acceptance — Countribus

Plan §12 + Addendum §4. Tests live in `tests/{unit,integration,e2e}`. Every
behaviour change ships with tests, including negative permission tests.

| Area              | Minimum acceptance                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Authorization     | Every role × every sensitive action; cross-vendor IDOR and direct API attempts fail safely            |
| Seat concurrency  | ≥2 users hold/book the same seat → at most one active allocation succeeds                             |
| Payment integrity | Valid/invalid signatures; duplicate/out-of-order webhooks; amount mismatch; timeout; provider failure |
| Booking lifecycle | Hold expiry, pending, paid, failed, cancelled, refunded, support-assisted exceptions                  |
| Luggage           | Quantity, weight/dimensions, allowance, fees, prohibited items, scan history                          |
| Fleet/scheduling  | Seat-layout changes, schedule snapshot, overlapping assignments, turnaround                           |
| Reports           | Reconcile booking totals, commission, refunds, settlements, manifests                                 |
| UX/a11y           | Keyboard nav, focus states, labels, contrast, validation errors, mobile responsiveness                |
| Performance       | Search API P95 < 2s at expected launch load (monitor real metrics)                                    |
| Reliability       | Backup/restore + incident response defined; target 99.9% after stabilisation                          |

## Addendum acceptance tests

- A paid confirmed booking produces a valid PDF ticket per passenger, visible in
  the customer account.
- Ticket email sends; failed delivery is visible and retryable without
  duplicating booking/payment.
- A customer cannot access another customer's ticket by changing an id/URL.
- A cancelled/refunded ticket fails QR verification even with an older PDF.
- A vendor sees all passengers for its own departures and no other vendor's.
- Manifest passenger count, seat list and luggage totals reconcile to confirmed
  bookings.
- A vehicle's manifests for different dates stay separate.
- Terminal staff operate only their assigned departures; cannot manage vehicles.
- PDF/CSV exports respect the same access rules and filters as on-screen.

## Current coverage (Phase 0)

- `tests/unit/permissions.test.ts` — role matrix + vehicle-management restriction.
- `tests/unit/money.test.ts` — kobo integer math, commission split, formatting.
- `tests/e2e/smoke.spec.ts` — landing + dashboard render.

## Test layers

- **Unit** (Vitest): pure domain logic — permissions, money, fare/luggage calc,
  state machines, validators.
- **Integration** (Vitest): server actions against a test Postgres (RLS on),
  seat concurrency, webhook idempotency.
- **E2E** (Playwright): passenger booking journey, vendor manifest, boarding.
