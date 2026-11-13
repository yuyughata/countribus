# Operations Runbook — Countribus

Operational procedures for launch and steady state. Pairs with
`docs/SECURITY_REVIEW.md` (controls) and `docs/ARCHITECTURE.md` (system shape).

## 1. Environments

| Env | Supabase | App | Secrets source |
| --- | --- | --- | --- |
| Local | local Postgres + harness | `pnpm dev` | `.env.local` (gitignored) |
| Production | project `nchgcofgwhvukuwynfnp` | Vercel | Vercel project env (encrypted) |

All schema change flows through `supabase/migrations/*` only — never ad-hoc SQL
in production. Validate every migration on a fresh local DB (harness + all
migrations + the matching `tests/db` suite) before applying live.

## 2. Deploy

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all must pass.
2. Apply new migrations to the project (review the diff; destructive changes
   require explicit human approval per `CLAUDE.md`).
3. Regenerate types (`pnpm gen:types`) and commit.
4. Deploy the app. Confirm `/` and `/search` render and a test search returns.
5. Smoke the booking funnel against a disposable schedule, then remove it.

Rollback: redeploy the previous app build; for schema, apply a forward
compensating migration (never edit a shipped migration file).

## 3. Backup & restore

- **Automated**: Supabase daily backups + Point-in-Time Recovery (verify the
  retention window in the project dashboard; raise it before pilot if needed).
- **Restore drill** (run once before launch, then quarterly):
  1. Restore the latest backup into a scratch project.
  2. Apply any migrations newer than the backup.
  3. Run every `tests/db/*.sql` suite against it — all `PASS`.
  4. Record the wall-clock restore time; that is the recovery-time estimate.
- The `financial_ledger` is append-only; never `DELETE`/`UPDATE` it to "fix"
  figures — post a compensating entry instead.

## 4. Monitoring & alerts

Watch and alert on:

- **Payment webhooks**: `webhook_events.result` distribution. Alert on any
  `amount_mismatch` or a spike in `unknown_reference` (possible tampering or a
  provider/config drift). `signature_valid=false` should be ~never.
- **Notifications**: rate of `public.notifications.status='failed'`. A sustained
  non-zero rate means the email provider is misconfigured or down. `skipped`
  simply means no provider is wired in that environment.
- **Seat contention**: hold/confirm error rates from the booking funnel;
  expired-hold reconciliation keeping inventory free.
- **Supabase advisors**: re-run security + performance advisors after every
  migration; triage new findings against `docs/SECURITY_REVIEW.md §5`.
- **App**: 5xx rate and p95 latency on `/search`, `/book/*`, and the webhook.

## 5. Incident response

1. **Assess** severity (money/data correctness > availability > cosmetic).
2. **Contain**: for a payment-integrity incident, the webhook is idempotent and
   amount-checked — inspect `webhook_events` / `payment_transactions` before any
   manual action; do not hand-edit `bookings.status`.
3. **Communicate**: status to stakeholders; affected passengers via the
   notifications channel.
4. **Recover**: forward migration or compensating ledger entry; never rewrite
   history.
5. **Postmortem**: blameless; capture the timeline, root cause, and a migration
   or test that would have caught it. Add that test.

Money, role, `vendor_id`, payment and seat state are authoritative on the
server only. Any "quick fix" that trusts a client value is itself an incident.

## 6. Launch checklist (pilot cutover)

- [ ] Production payment keys + webhook secrets set in Vercel (test → live).
- [ ] `RESEND_API_KEY` + `NOTIFICATIONS_FROM_EMAIL` set; send one real
      confirmation email end-to-end and confirm `notifications.status='sent'`.
- [ ] Supabase Auth: leaked-password protection on; rate limits tightened;
      sender domain / SMTP verified for signups.
- [ ] Backup retention/PITR confirmed; restore drill completed (§3).
- [ ] Independent provider verify-GET added to the webhook (defence in depth).
- [ ] Advisors clean or every finding dispositioned (`SECURITY_REVIEW.md §5`).
- [ ] Load-test seat contention on a popular route (parallel holds) — no
      double-allocation, holds expire and reconcile.
- [ ] Accessibility pass signed off (§7).

## 7. Accessibility & performance baseline

- **A11y**: semantic landmarks and `aria-current` in the dashboard nav; buttons
  are real `<button>`/`<a>`; forms use associated `<label>`s; color is paired
  with text/icon (never the sole signal); focus-visible styling on controls;
  color tokens target WCAG AA contrast in light and dark. Re-check with an axe
  pass per release and keyboard-navigate the booking funnel.
- **Performance**: tenant and search indexes exist (`schedules_search_idx`,
  per-vendor indexes, `notifications_user_idx`); seat inventory uses partial
  unique indexes and `btree_gist` exclusion rather than table locks; metrics are
  single-round-trip RPCs. Keep Next.js dynamic only where auth-bound; `/` and
  auth pages stay static.

## 8. Pilot plan

Start with a small set of vetted vendors and a limited route list. Watch the
§4 signals daily for the first two weeks. Gate general availability on: zero
payment-integrity incidents, confirmation-email delivery ≥ target, and seat
contention holding under real load.
