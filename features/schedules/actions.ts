"use server";

import { revalidatePath } from "next/cache";

import { canForVendor, requireUser } from "@/lib/auth/context";
import { nairaToKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { routeSchema, scheduleSchema } from "@/lib/validation/schedules";

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function createRoute(input: unknown): Promise<Result<{ routeId: string }>> {
  const ctx = await requireUser();
  const parsed = routeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid route" };
  if (!canForVendor(ctx, parsed.data.vendorId, "route:manage")) {
    return { ok: false, error: "Not allowed to manage routes for this vendor" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routes")
    .insert({
      vendor_id: parsed.data.vendorId,
      origin_terminal_id: parsed.data.originTerminalId,
      destination_terminal_id: parsed.data.destinationTerminalId,
      name: parsed.data.name,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create route" };
  revalidatePath("/dashboard/schedules");
  return { ok: true, data: { routeId: data.id } };
}

export async function createSchedule(input: unknown): Promise<Result<{ scheduleId: string }>> {
  const ctx = await requireUser();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid schedule" };
  if (!canForVendor(ctx, parsed.data.vendorId, "schedule:manage")) {
    return { ok: false, error: "Not allowed to manage schedules for this vendor" };
  }
  const supabase = await createClient();

  // Copy origin/destination from the route (keeps search self-contained).
  const { data: route } = await supabase
    .from("routes")
    .select("origin_terminal_id, destination_terminal_id, vendor_id")
    .eq("id", parsed.data.routeId)
    .maybeSingle();
  if (!route || route.vendor_id !== parsed.data.vendorId) {
    return { ok: false, error: "Route not found" };
  }

  const { data, error } = await supabase
    .from("schedules")
    .insert({
      vendor_id: parsed.data.vendorId,
      route_id: parsed.data.routeId,
      vehicle_id: parsed.data.vehicleId,
      origin_terminal_id: route.origin_terminal_id,
      destination_terminal_id: route.destination_terminal_id,
      departure_at: new Date(parsed.data.departureAt).toISOString(),
      arrival_estimate_at: new Date(parsed.data.arrivalEstimateAt).toISOString(),
      base_fare_kobo: nairaToKobo(parsed.data.fareNaira),
      boarding_address: parsed.data.boardingAddress,
      boarding_contact_phone: parsed.data.boardingContactPhone,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create schedule" };
  revalidatePath("/dashboard/schedules");
  return { ok: true, data: { scheduleId: data.id } };
}

/**
 * Delete a route (owner/manager/admin). Blocked by FK if the route still has
 * schedules — we surface a clear message instead of a raw DB error.
 */
export async function deleteRoute(routeId: string): Promise<Result> {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: route } = await supabase
    .from("routes")
    .select("vendor_id")
    .eq("id", routeId)
    .maybeSingle();
  if (!route) return { ok: false, error: "Route not found" };
  if (!canForVendor(ctx, route.vendor_id, "route:manage")) {
    return { ok: false, error: "Not allowed to manage routes for this vendor" };
  }
  const { error } = await supabase.from("routes").delete().eq("id", routeId);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "This route still has schedules. Cancel or remove those departures first.",
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/routes");
  revalidatePath("/dashboard/schedules");
  return { ok: true, data: undefined };
}

export async function publishSchedule(scheduleId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  // Authorization + snapshot + inventory are enforced inside publish_schedule().
  const { error } = await supabase.rpc("publish_schedule", { p_schedule: scheduleId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/schedules");
  return { ok: true, data: undefined };
}

export async function cancelSchedule(scheduleId: string): Promise<Result> {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("schedules")
    .select("vendor_id")
    .eq("id", scheduleId)
    .maybeSingle();
  if (!s) return { ok: false, error: "Schedule not found" };
  if (!canForVendor(ctx, s.vendor_id, "schedule:manage"))
    return { ok: false, error: "Not allowed" };
  const { error } = await supabase
    .from("schedules")
    .update({ status: "cancelled" })
    .eq("id", scheduleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/schedules");
  return { ok: true, data: undefined };
}
