"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { AgreementKind } from "@/features/agreements/queries";

export type Result = { ok: true } | { ok: false; error: string };

async function admin() {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) throw new Error("forbidden");
  return ctx;
}

function revalidate(kind: AgreementKind) {
  revalidatePath(`/dashboard/agreements/${kind}`);
  revalidatePath("/apply");
  revalidatePath("/boarding-policy");
}

/** Publish a new version if the visible clauses changed (server dedups by hash). */
async function bump(kind: AgreementKind) {
  const supabase = await createClient();
  await supabase.rpc("publish_agreement", { p_kind: kind });
  revalidate(kind);
}

export async function addClause(kind: AgreementKind, title: string, body: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  if (!title.trim()) return { ok: false, error: "Add a clause title" };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("agreement_clauses")
    .select("sort_order")
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("agreement_clauses").insert({
    kind,
    title: title.trim(),
    body: body.trim(),
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return { ok: false, error: error.message };
  await bump(kind);
  return { ok: true };
}

export async function updateClause(id: string, title: string, body: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  if (!title.trim()) return { ok: false, error: "Add a clause title" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agreement_clauses")
    .update({ title: title.trim(), body: body.trim() })
    .eq("id", id)
    .select("kind")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Not found" };
  await bump(data.kind as AgreementKind);
  return { ok: true };
}

export async function toggleClauseHidden(id: string, hidden: boolean): Promise<Result> {
  try {
    await admin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agreement_clauses")
    .update({ is_hidden: hidden })
    .eq("id", id)
    .select("kind")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Not found" };
  await bump(data.kind as AgreementKind);
  return { ok: true };
}

export async function deleteClause(id: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agreement_clauses")
    .delete()
    .eq("id", id)
    .select("kind")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Not found" };
  await bump(data.kind as AgreementKind);
  return { ok: true };
}

/** Swap a clause with its neighbour in the given direction. */
export async function moveClause(id: string, dir: "up" | "down"): Promise<Result> {
  try {
    await admin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { data: self } = await supabase
    .from("agreement_clauses")
    .select("id, kind, sort_order")
    .eq("id", id)
    .single();
  if (!self) return { ok: false, error: "Not found" };

  const base = supabase.from("agreement_clauses").select("id, sort_order").eq("kind", self.kind);
  const { data: neighbor } =
    dir === "up"
      ? await base
          .lt("sort_order", self.sort_order)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await base
          .gt("sort_order", self.sort_order)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
  if (!neighbor) return { ok: true }; // already at the edge

  await supabase
    .from("agreement_clauses")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", self.id);
  await supabase
    .from("agreement_clauses")
    .update({ sort_order: self.sort_order })
    .eq("id", neighbor.id);
  await bump(self.kind as AgreementKind);
  return { ok: true };
}
