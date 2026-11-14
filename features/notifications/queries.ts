import "server-only";

import { createClient } from "@/lib/supabase/server";

export type InAppNotification = {
  id: string;
  template: string;
  createdAt: string;
  readAt: string | null;
  title: string;
  body: string;
  href: string | null;
};

export type InAppFeed = { items: InAppNotification[]; unread: number };

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * The signed-in user's in-app notifications (newest first) + unread count.
 * Explicitly scoped to the user: the notifications RLS also lets platform
 * admins read every row, so we filter by user_id to keep each bell personal.
 */
export async function getInAppFeed(limit = 12): Promise<InAppFeed> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unread: 0 };

  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, template, created_at, read_at, payload")
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .is("read_at", null),
  ]);

  const items: InAppNotification[] = (data ?? []).map((r) => {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      template: r.template as string,
      createdAt: r.created_at as string,
      readAt: (r.read_at as string | null) ?? null,
      title: asText(p.title) || "Notification",
      body: asText(p.body),
      href: asText(p.href) || null,
    };
  });

  return { items, unread: count ?? 0 };
}
