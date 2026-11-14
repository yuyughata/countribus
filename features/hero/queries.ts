import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HeroImage = {
  id: string;
  url: string;
  caption: string | null;
  is_active: boolean;
  sort_order: number;
  storage_path: string | null;
};

const COLS = "id, url, caption, is_active, sort_order, storage_path";

/** Active hero images for the public homepage slideshow. */
export async function listActiveHeroImages(): Promise<HeroImage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hero_images")
    .select(COLS)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as HeroImage[];
}

/** Every hero image (admin management view). */
export async function listAllHeroImages(): Promise<HeroImage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hero_images")
    .select(COLS)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as HeroImage[];
}
