-- Record which Terms & Conditions version the customer accepted at booking,
-- alongside the boarding-policy version already stamped. Completes the
-- acceptance audit trail (terms_accepted_at + the exact versions agreed to).
alter table public.bookings
  add column terms_agreement_id uuid references public.agreements (id) on delete set null;

notify pgrst, 'reload schema';
