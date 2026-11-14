import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CampaignRow = {
  id: string;
  type: string;
  subject: string;
  status: string;
  recipient_count: number | null;
  sent_count: number | null;
  updated_at: string;
  sent_at: string | null;
};

export type Campaign = {
  id: string;
  type: string;
  subject: string;
  preview_text: string | null;
  header_image_url: string | null;
  body_html: string;
  button_text: string | null;
  button_url: string | null;
  footer_image_url: string | null;
  audiences: string[];
  extra_recipients: string[];
  status: string;
};

export async function listCampaigns(limit = 20): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_campaigns")
    .select("id, type, subject, status, recipient_count, sent_count, updated_at, sent_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CampaignRow[];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_campaigns")
    .select(
      "id, type, subject, preview_text, header_image_url, body_html, button_text, button_url, footer_image_url, audiences, extra_recipients, status",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as Campaign | null) ?? null;
}
