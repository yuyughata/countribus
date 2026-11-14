"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

const BUCKET = "hero";
const MAX_BYTES = 6 * 1024 * 1024;

function revalidate() {
  revalidatePath("/");
  revalidatePath("/dashboard/homepage");
}

/** Upload a hero slideshow image (admin only). Uses the admin's own session;
 *  Storage RLS restricts writes on the public `hero` bucket to platform admins. */
export async function uploadHeroImage(formData: FormData): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only a platform admin can manage hero images" };

  const file = formData.get("file");
  const caption = ((formData.get("caption") as string) || "").trim() || null;
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image file" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "The file must be an image" };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image must be under 6 MB" };

  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: last } = await supabase
    .from("hero_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("hero_images")
    .insert({ url: pub.publicUrl, storage_path: path, caption, sort_order, is_active: true });
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteHeroImage(id: string): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Not allowed" };
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("hero_images")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("hero_images").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (row?.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]);
  revalidate();
  return { ok: true };
}

export async function toggleHeroImage(id: string, active: boolean): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Not allowed" };
  const supabase = await createClient();
  const { error } = await supabase.from("hero_images").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

/** Swap an image's order with its neighbour. */
export async function moveHeroImage(id: string, dir: "up" | "down"): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Not allowed" };
  const supabase = await createClient();
  const { data: all } = await supabase
    .from("hero_images")
    .select("id, sort_order")
    .order("sort_order")
    .order("created_at");
  if (!all) return { ok: false, error: "No images" };
  const idx = all.findIndex((r) => r.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= all.length) return { ok: true };
  const a = all[idx];
  const b = all[swapIdx];
  // Use distinct orders even if the stored values collide.
  await supabase.from("hero_images").update({ sort_order: -1 }).eq("id", a.id);
  await supabase.from("hero_images").update({ sort_order: a.sort_order }).eq("id", b.id);
  await supabase.from("hero_images").update({ sort_order: b.sort_order }).eq("id", a.id);
  revalidate();
  return { ok: true };
}
