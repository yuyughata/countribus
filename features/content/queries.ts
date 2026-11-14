import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOMEPAGE,
  type HomepageContent,
  type HomepageKey,
} from "@/lib/content/homepage";

/**
 * Homepage content = built-in defaults with any admin overrides merged on top
 * (shallow, per section). Reads are public (site_content is public content), so
 * this works for the anonymous landing page.
 */
export async function getHomepageContent(): Promise<HomepageContent> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value as Record<string, unknown>]));
  const merge = <T,>(key: HomepageKey, def: T): T => ({ ...def, ...(map.get(key) ?? {}) }) as T;
  return {
    hero: merge("hero", DEFAULT_HOMEPAGE.hero),
    features: merge("features", DEFAULT_HOMEPAGE.features),
    how: merge("how", DEFAULT_HOMEPAGE.how),
    operator: merge("operator", DEFAULT_HOMEPAGE.operator),
  };
}
