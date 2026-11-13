# Product Requirements — Countribus

> Source of truth distilled from `PRODUCT_DEVELOPMENT_PLAN.docx`. Where this file
> and the DOCX differ, raise it in `DECISIONS.md` rather than guessing.

## Vision

A trusted marketplace where passengers discover and book intercity journeys from
multiple Nigerian transport operators, while each operator runs its own branded
booking portal and manages fleet, routes, schedules, passengers, luggage and
revenue.

## Core outcomes

1. Central passenger marketplace **plus** vendor-branded booking portals.
2. Nationwide Nigerian locations, terminals, routes and scheduled departures.
3. Reliable live seat inventory with temporary holds and concurrency-safe booking.
4. Online-only payments via Paystack and Flutterwave, with a percentage platform
   commission.
5. Per-passenger luggage declaration, QR luggage tags and operational scan history.
6. Role-specific admin, vendor and terminal workflows with strict tenant isolation.
7. Responsive website and installable PWA; native apps are out of initial scope.

## MVP scope (vs. later)

| Area           | MVP                                                                       | Later                                       |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| Marketplace    | Search direct journeys by origin, destination, date, category, pax        | Multi-leg / segment pricing                 |
| Vendor portals | Branded landing/booking pages, profile, own inventory                     | Custom domains, CMS, subscription tiers     |
| Fleet          | 18-seater, Coaster, luxury coach; configurable per-vehicle seat layouts   | Maintenance, telematics, tracking           |
| Scheduling     | Direct journeys, date/time, fare, assigned vehicle, capacity, cut-off     | Recurring builder, route segments           |
| Booking        | Passenger details, seat selection, reference, ticket, cancellation policy | Changes, loyalty, group bookings            |
| Payments       | Paystack + Flutterwave checkout, verified webhook, commission ledger      | Automated split settlements, more providers |
| Luggage        | Per-passenger declaration, limits/fees, QR tag, scan events               | Weighing-device integration, claims         |
| Operations     | Passenger/luggage manifests, boarding verification, dashboards            | Offline-first sync, terminal hardware       |
| Comms          | Email, SMS, WhatsApp templates; instant + daily vendor summaries          | Campaign automation, richer CRM             |

## Roles (plan §3)

`super_admin`, `vendor_owner`, `vendor_manager`, `booking_officer`,
`terminal_staff`, `luggage_officer`, `finance_officer`, `passenger`.

**Critical boundary:** Vehicle management (create/edit/deactivate, seat-template
config, assignment) is available **only** to Super Admin and authorised Vendor
Owner/Manager. Terminal staff and passengers never get it; terminal staff may
_view_ limited vehicle info for an assigned trip. Enforced in
`lib/permissions/roles.ts` + RLS + server checks.

## Confirmed MVP additions (DOCX Addendum 1)

- **Customer PDF tickets** — per-passenger, generated server-side only after
  verified payment, stored privately, available in the customer account and
  emailed; tamper-resistant QR that verifies server-side; invalidated on
  cancel/refund. Tables: `ticket_documents`, `ticket_delivery_events`.
- **Vendor departure manifests** — full passenger + luggage list scoped to a
  specific schedule/departure (not a vehicle across dates); searchable,
  filterable, paginated; PDF/CSV export respecting the same access rules;
  lockable final snapshot with audit trail; terminal staff limited to their
  assigned departures.

## MVP feature checklist (Appendix A)

- [ ] Central marketplace + vendor-branded booking portals
- [ ] Vendor onboarding, approval, vendor staff roles
- [ ] Nationwide states/cities/terminals directory
- [ ] Vehicle categories + configurable per-vehicle seat layouts
- [ ] Routes, direct schedules, vehicle assignment, fares
- [ ] Journey search + real-time seat availability
- [ ] Temporary seat holds + concurrency-safe booking
- [ ] Passenger-by-passenger details + luggage declaration
- [ ] Paystack + Flutterwave online payments
- [ ] Verified webhooks, percentage commission, financial ledger
- [ ] Electronic tickets with QR verification + downloadable PDF
- [ ] QR luggage tags + luggage event tracking
- [ ] Passenger, luggage and combined PDF manifests
- [ ] Admin/vendor dashboards using the approved visual theme
- [ ] Email, SMS, WhatsApp and in-app notifications
- [ ] Responsive website + installable PWA
- [ ] RLS, audit logs, automated tests, production monitoring

## Open decisions before production

See `DECISIONS.md` §"To confirm" — commission basis, settlement cadence,
cancellation/refund rules, seat-hold duration, luggage policy, required
passenger identity, vendor payment-account model, vendor approval evidence.
