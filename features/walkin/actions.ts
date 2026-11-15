"use server";

import { requireUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import type { CounterMethod } from "@/lib/supabase/database.types";

export type WalkinSeat = {
  seat_id: string;
  seat_label: string;
  state: "available" | "booked" | "held" | "blocked";
  surcharge_kobo: number;
};

/** Live seat map for the chosen departure (used by the counter seat picker). */
export async function loadWalkinSeatMap(scheduleId: string): Promise<WalkinSeat[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_seats")
    .select("seat_id, seat_label, state, surcharge_kobo")
    .eq("schedule_id", scheduleId)
    .order("seat_label");
  return (data ?? []) as WalkinSeat[];
}

export type WalkinInput = {
  scheduleId: string;
  method: CounterMethod;
  contact: { name: string; phone: string; email?: string };
  passengers: {
    seat_id: string;
    full_name: string;
    phone?: string;
    type: "adult" | "child_6_10";
  }[];
  /** Lap infants (child 1–5): free, no seat. */
  infants?: { full_name: string }[];
  /** Optional staff/receipt reference; defaults to the booking reference. */
  receiptRef?: string;
};

export type WalkinResult =
  | { ok: true; reference: string; amountKobo: number }
  | { ok: false; error: string };

/**
 * Record a walk-in (counter) booking: create the booking and take payment in
 * one atomic server step. Prices are computed server-side by the RPC; the
 * client never supplies a fare. Authorization is enforced in the database
 * (`create_walkin_booking` requires owner/manager/booking-officer on the
 * schedule's vendor, or platform admin) and re-checked here for a clean error.
 */
export async function createWalkInBooking(input: WalkinInput): Promise<WalkinResult> {
  const ctx = await requireUser();

  const authorized =
    ctx.isPlatformAdmin || ctx.memberships.some((m) => can(m.role, "booking:counter"));
  if (!authorized) {
    return { ok: false, error: "You are not authorized to record walk-in bookings" };
  }

  if (input.passengers.length === 0) {
    return { ok: false, error: "Add at least one seated passenger" };
  }
  for (const p of input.passengers) {
    if (!p.full_name.trim()) return { ok: false, error: "Enter every passenger's name" };
    if (!p.seat_id) return { ok: false, error: "Assign a seat to every passenger" };
  }
  if (!input.contact.name.trim() || !input.contact.phone.trim()) {
    return { ok: false, error: "Enter the lead passenger's name and phone number" };
  }

  const infants = (input.infants ?? []).filter((i) => i.full_name.trim());

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_walkin_booking", {
    p_schedule: input.scheduleId,
    p_contact: input.contact,
    p_passengers: input.passengers,
    p_infants: infants,
    p_method: input.method,
    p_receipt_ref: input.receiptRef?.trim() || undefined,
  });
  if (error) return { ok: false, error: error.message };

  const row = (data as { reference: string; amount_kobo: number }[])[0];
  if (!row) return { ok: false, error: "Could not create the walk-in booking" };

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/walk-in");
  return { ok: true, reference: row.reference, amountKobo: row.amount_kobo };
}
