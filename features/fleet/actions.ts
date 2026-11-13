"use server";

import { revalidatePath } from "next/cache";

import { canForVendor, requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { seatTemplateSchema, vehicleSchema } from "@/lib/validation/fleet";
import type { VehicleStatus } from "@/lib/supabase/database.types";

export type FleetResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Create a vehicle. Restricted to super_admin / vendor_owner / vendor_manager
 * (the `vehicle:manage` capability) — enforced here AND by RLS. Terminal staff
 * and passengers can never reach this.
 */
export async function createVehicle(input: unknown): Promise<FleetResult<{ vehicleId: string }>> {
  const ctx = await requireUser();
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };

  if (!canForVendor(ctx, parsed.data.vendorId, "vehicle:manage")) {
    return { ok: false, error: "You are not allowed to manage vehicles for this vendor" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      vendor_id: parsed.data.vendorId,
      category_id: parsed.data.categoryId,
      registration_no: parsed.data.registrationNo,
      display_name: parsed.data.displayName || null,
      capacity: parsed.data.capacity,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create vehicle" };

  revalidatePath("/dashboard/fleet");
  return { ok: true, data: { vehicleId: data.id } };
}

export async function setVehicleStatus(
  vehicleId: string,
  status: VehicleStatus,
): Promise<FleetResult> {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("vendor_id")
    .eq("id", vehicleId)
    .maybeSingle();
  if (!vehicle) return { ok: false, error: "Vehicle not found" };
  if (!canForVendor(ctx, vehicle.vendor_id, "vehicle:manage")) {
    return { ok: false, error: "Not allowed" };
  }
  const { error } = await supabase.from("vehicles").update({ status }).eq("id", vehicleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/fleet");
  return { ok: true, data: undefined };
}

/**
 * Create a seat template with its seats, then publish it (frozen layout).
 * The DB enforces the publish-freeze and vendor scoping; this is the server
 * authorization check.
 */
export async function saveSeatTemplate(
  input: unknown,
): Promise<FleetResult<{ templateId: string }>> {
  const ctx = await requireUser();
  const parsed = seatTemplateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid layout" };

  if (!canForVendor(ctx, parsed.data.vendorId, "vehicle:manage")) {
    return { ok: false, error: "You are not allowed to configure seat layouts for this vendor" };
  }

  const supabase = await createClient();
  const { data: tpl, error } = await supabase
    .from("seat_templates")
    .insert({
      vendor_id: parsed.data.vendorId,
      vehicle_id: parsed.data.vehicleId || null,
      name: parsed.data.name,
      rows: parsed.data.rows,
      columns: parsed.data.columns,
    })
    .select("id")
    .single();
  if (error || !tpl) return { ok: false, error: error?.message ?? "Could not create template" };

  const { error: seatErr } = await supabase.from("seat_template_seats").insert(
    parsed.data.seats.map((s) => ({
      seat_template_id: tpl.id,
      seat_label: s.seatLabel,
      row: s.row,
      col: s.col,
      seat_type: s.seatType,
      is_sellable: s.isSellable,
    })),
  );
  if (seatErr) return { ok: false, error: seatErr.message };

  // Publish (freeze) once seats are written.
  const { error: pubErr } = await supabase
    .from("seat_templates")
    .update({ is_published: true })
    .eq("id", tpl.id);
  if (pubErr) return { ok: false, error: pubErr.message };

  revalidatePath("/dashboard/fleet");
  return { ok: true, data: { templateId: tpl.id } };
}
