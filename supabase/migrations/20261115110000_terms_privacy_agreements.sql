-- ===========================================================================
-- Add two more editable legal documents to the Agreements system:
-- Terms & Conditions ('terms') and Privacy Policy ('privacy'). They reuse the
-- same clause editor + versioning as the Partner Agreement and Boarding Policy.
-- ===========================================================================

alter table public.agreement_clauses drop constraint agreement_clauses_kind_check;
alter table public.agreement_clauses
  add constraint agreement_clauses_kind_check
  check (kind in ('partner', 'boarding', 'terms', 'privacy'));

alter table public.agreements drop constraint agreements_kind_check;
alter table public.agreements
  add constraint agreements_kind_check
  check (kind in ('partner', 'boarding', 'terms', 'privacy'));

-- Seed default clauses (idempotent — skip if this kind already has any).
insert into public.agreement_clauses (kind, title, body, sort_order)
select * from (values
  ('terms', 'About Countribus',
   'Countribus is a marketplace that connects travellers with verified intercity bus operators. When you book a trip you enter into a transport contract with the operator; Countribus provides the booking, payment and ticketing service.', 1),
  ('terms', 'Bookings & payment',
   'Fares are shown per seat and confirmed at checkout. A booking is only confirmed once payment is verified by the payment provider. You will receive a digital ticket by email; present it, with valid identification, at the boarding terminal.', 2),
  ('terms', 'Cancellations & refunds',
   'Cancellations and refunds follow the operator''s policy and these platform terms. Where a refund is due it is returned to your original payment method.', 3),
  ('terms', 'Conduct & liability',
   'Please travel respectfully and follow crew instructions. The operator is responsible for the transport service; Countribus is responsible for the booking platform. These terms may be updated from time to time.', 4)
) as t(kind, title, body, sort_order)
where not exists (select 1 from public.agreement_clauses where kind = 'terms');

insert into public.agreement_clauses (kind, title, body, sort_order)
select * from (values
  ('privacy', 'Information we collect',
   'We collect the details you provide when you create an account or book a trip — such as your name, email, phone number and passenger details — and basic technical data needed to run the service.', 1),
  ('privacy', 'How we use your information',
   'We use your information to process bookings and payments, issue tickets, send booking and travel notifications, provide support, and keep the platform secure. We do not sell your personal data.', 2),
  ('privacy', 'Sharing',
   'We share only the information an operator needs to carry you (such as your name and passenger type on the manifest) and the information payment and messaging providers need to complete a transaction or notification.', 3),
  ('privacy', 'Data retention & security',
   'We keep booking records for as long as needed to provide the service and meet legal and accounting obligations. Access is restricted and sensitive data is protected in transit and at rest.', 4),
  ('privacy', 'Your rights & contact',
   'You can request access to, correction of, or deletion of your personal data, subject to records we must retain. Contact Countribus support for any privacy request. This policy may be updated from time to time.', 5)
) as t(kind, title, body, sort_order)
where not exists (select 1 from public.agreement_clauses where kind = 'privacy');

-- Publish version 1 for each new kind from its visible clauses.
do $$
declare
  k text;
  v_content jsonb;
begin
  foreach k in array array['terms', 'privacy'] loop
    select coalesce(
      jsonb_agg(jsonb_build_object('title', title, 'body', body) order by sort_order),
      '[]'::jsonb
    )
      into v_content
      from public.agreement_clauses where kind = k and not is_hidden;
    insert into public.agreements (kind, version, content, content_hash)
      values (k, 1, v_content, md5(v_content::text))
      on conflict (kind, version) do nothing;
  end loop;
end $$;

notify pgrst, 'reload schema';
