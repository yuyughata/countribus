-- Phase 9: promo codes & referrals.
--   * promo_quote validation (percent, min-fare, inactive, expired, caps)
--   * discount applied by create_booking_from_hold
--   * referral attribution on signup (metadata code)
--   * referrer reward granted on the referee's first paid booking, consumed on
--     the referrer's own paid booking
--   * RLS: customers can't read promo_codes or others' referral rewards
-- Expects a FRESH database (harness + all migrations). All lines must read PASS.
\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- =============================================================== users / signup
-- Owner, referrer (R), third party (X).
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000b1','owner@promo.ng');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000b2','ref@promo.ng');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000b4','x@promo.ng');

-- Referee (F) signs up WITH R's referral code in metadata.
do $$ declare rcode text; begin
  select referral_code into rcode from public.profiles where id='00000000-0000-0000-0000-0000000000b2';
  insert into auth.users(id,email,raw_user_meta_data)
    values ('00000000-0000-0000-0000-0000000000b3','referee@promo.ng',
            jsonb_build_object('referral_code', rcode, 'full_name','Fola Friend'));
end $$;
-- A signup with an unknown code creates no referral.
insert into auth.users(id,email,raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000b5','nobody@promo.ng', jsonb_build_object('referral_code','ZZZZZZZZ'));

select pg_temp.chk('every profile got a referral code',
  (select count(*)=0 from public.profiles where referral_code is null));
select pg_temp.chk('referral attributed on signup (R -> F, pending)',
  (select count(*)=1 from public.referrals
    where referrer_id='00000000-0000-0000-0000-0000000000b2'
      and referee_id='00000000-0000-0000-0000-0000000000b3' and status='pending'));
select pg_temp.chk('unknown referral code creates no referral',
  (select count(*)=0 from public.referrals where referee_id='00000000-0000-0000-0000-0000000000b5'));

-- =============================================================== vendor fixtures
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000b1','P','p-p9','00000000-0000-0000-0000-0000000000b1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000000b1'; reset role;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b1',cat,'P9-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('30000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b1','20000000-0000-0000-0000-0000000000b1','L',2,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2),(tid,'2A',2,1),(tid,'2B',2,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('40000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b1',orig,dest,'L-P9') returning id into rid;
  -- Three schedules (staggered to avoid vehicle conflicts), base fare 1,000,000 kobo.
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo) values
    ('50000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b1',rid,'20000000-0000-0000-0000-0000000000b1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000),
    ('50000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-0000000000b1',rid,'20000000-0000-0000-0000-0000000000b1',orig,dest, now()+interval '5 days', now()+interval '5 days 9 hours', 1000000),
    ('50000000-0000-0000-0000-0000000000b3','10000000-0000-0000-0000-0000000000b1',rid,'20000000-0000-0000-0000-0000000000b1',orig,dest, now()+interval '7 days', now()+interval '7 days 9 hours', 1000000);
  perform public.publish_schedule('50000000-0000-0000-0000-0000000000b1');
  perform public.publish_schedule('50000000-0000-0000-0000-0000000000b2');
  perform public.publish_schedule('50000000-0000-0000-0000-0000000000b3');
end $$;
reset role; reset request.jwt.claims;

-- =============================================================== promo codes
set role service_role;
insert into public.promo_codes(code,discount_percent) values ('SAVE20',20);
insert into public.promo_codes(code,discount_percent,min_fare_kobo) values ('BIG',50,2000000);
insert into public.promo_codes(code,discount_percent,is_active) values ('OFFNOW',10,false);
insert into public.promo_codes(code,discount_percent,ends_at) values ('OLD',10, now()-interval '1 day');
insert into public.promo_codes(code,discount_percent,max_discount_kobo) values ('CAP',50,300000);
insert into public.promo_codes(code,discount_percent,max_redemptions) values ('ONEONLY',10,1);
reset role;

-- promo_quote is security definer; anon may call it for a live quote.
set role anon;
select pg_temp.chk('SAVE20 = 20% of 1,000,000 = 200,000',
  (select discount_kobo=200000 and reason is null from public.promo_quote('SAVE20',1000000,null)));
select pg_temp.chk('lowercase code is normalised',
  (select reason is null from public.promo_quote('save20',1000000,null)));
select pg_temp.chk('unknown code rejected',
  (select promo_id is null and reason is not null from public.promo_quote('NOPE',1000000,null)));
select pg_temp.chk('inactive code rejected',
  (select reason is not null from public.promo_quote('OFFNOW',1000000,null)));
select pg_temp.chk('expired code rejected',
  (select reason is not null from public.promo_quote('OLD',1000000,null)));
select pg_temp.chk('below min-fare rejected',
  (select reason is not null from public.promo_quote('BIG',1000000,null)));
select pg_temp.chk('at min-fare: BIG = 50% of 2,000,000 = 1,000,000',
  (select reason is null and discount_kobo=1000000 from public.promo_quote('BIG',2000000,null)));
select pg_temp.chk('max-discount cap applied (CAP 50% of 1,000,000 capped to 300,000)',
  (select discount_kobo=300000 from public.promo_quote('CAP',1000000,null)));
reset role;

-- =============================================================== apply promo to a booking
set role anon;
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000b1' and seat_label='1A';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000b1', array[s1], 'tok-p1', 10);
  perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000000b1','tok-p1',
    '{"name":"Guest","phone":"+2348030000000"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','Guest One')),
    '[]'::jsonb, 'SAVE20', false);
end $$;
reset role;
select pg_temp.chk('promo booking: fare 1,000,000 / discount 200,000 / grand 800,000',
  (select total_fare_kobo=1000000 and discount_kobo=200000 and grand_total_kobo=800000
     from public.bookings where contact_name='Guest'));
select pg_temp.chk('booking records which promo was applied',
  (select promo_code_id=(select id from public.promo_codes where code='SAVE20') from public.bookings where contact_name='Guest'));

-- max_redemptions: ONEONLY good once, then fully redeemed.
set role anon;
select pg_temp.chk('ONEONLY valid before use', (select reason is null from public.promo_quote('ONEONLY',1000000,null)));
do $$ declare s2 text; begin
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000b1' and seat_label='1B';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000b1', array[s2], 'tok-p2', 10);
  perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000000b1','tok-p2',
    '{"name":"Guest2","phone":"+2348030000009"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s2,'full_name','Guest Two')),
    '[]'::jsonb, 'ONEONLY', false);
end $$;
select pg_temp.chk('ONEONLY rejected after its single redemption',
  (select reason is not null from public.promo_quote('ONEONLY',1000000,null)));
reset role;

-- =============================================================== referral reward lifecycle
set role service_role;
update public.referral_program set is_enabled=true, referrer_percent=15, min_qualifying_fare_kobo=0, updated_at=now();
reset role;

-- F books schedule 2 and pays -> R earns a reward, referral becomes qualified.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
do $$ declare s text; begin
  select seat_id into s from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000b2' and seat_label='1A';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000b2', array[s], 'tok-f', 10);
  perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000000b2','tok-f',
    '{"name":"Fola Friend","phone":"+2348031111111"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s,'full_name','Fola Friend')));
end $$;
reset role; reset request.jwt.claims;
set role service_role;
insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo)
  select id,'paystack','PSK-F', grand_total_kobo from public.bookings where contact_name='Fola Friend';
select pg_temp.chk('F first paid booking confirms',
  public.confirm_payment('paystack','evt-f','PSK-F',(select grand_total_kobo from public.bookings where contact_name='Fola Friend')) = 'confirmed');
reset role;
select pg_temp.chk('referral is now qualified', (select status='qualified' from public.referrals where referee_id='00000000-0000-0000-0000-0000000000b3'));
select pg_temp.chk('referrer R earned one available 15% reward',
  (select count(*)=1 from public.referral_rewards where referrer_id='00000000-0000-0000-0000-0000000000b2' and status='available' and discount_percent=15));

-- R redeems the reward on schedule 3: discount applied, reward consumed only on payment.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
do $$ declare s text; begin
  select seat_id into s from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000b3' and seat_label='1A';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000b3', array[s], 'tok-r', 10);
  perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000000b3','tok-r',
    '{"name":"Ref Redeem","phone":"+2348032222222"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s,'full_name','Ref Redeem')),
    '[]'::jsonb, null, true);
end $$;
reset role; reset request.jwt.claims;
select pg_temp.chk('referral reward applied: 15% of 1,000,000 = 150,000 discount',
  (select discount_kobo=150000 and grand_total_kobo=850000 from public.bookings where contact_name='Ref Redeem'));
select pg_temp.chk('reward still available until the booking is paid',
  (select status='available' from public.referral_rewards where referrer_id='00000000-0000-0000-0000-0000000000b2'));
set role service_role;
insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo)
  select id,'paystack','PSK-R', grand_total_kobo from public.bookings where contact_name='Ref Redeem';
select pg_temp.chk('R redemption booking confirms',
  public.confirm_payment('paystack','evt-r','PSK-R',(select grand_total_kobo from public.bookings where contact_name='Ref Redeem')) = 'confirmed');
reset role;
select pg_temp.chk('reward consumed (used) after payment',
  (select status='used' from public.referral_rewards where referrer_id='00000000-0000-0000-0000-0000000000b2'));

-- =============================================================== RLS negatives
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';
select pg_temp.chk('customer cannot read promo_codes', (select count(*)=0 from public.promo_codes));
select pg_temp.chk('customer cannot read another user''s referral rewards',
  (select count(*)=0 from public.referral_rewards));
reset role; reset request.jwt.claims;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select pg_temp.chk('referrer can read their own reward', (select count(*)>=1 from public.referral_rewards));
reset role; reset request.jwt.claims;
