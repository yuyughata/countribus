import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AgreementKind = "partner" | "boarding";

export type Clause = {
  id: string;
  kind: string;
  title: string;
  body: string;
  sort_order: number;
  is_hidden: boolean;
};

export type AgreementVersion = {
  id: string;
  kind: string;
  version: number;
  content: { title: string; body: string }[];
  published_at: string;
};

/** All clauses (incl. hidden) for the admin editor. */
export async function listClauses(kind: AgreementKind): Promise<Clause[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agreement_clauses")
    .select("id, kind, title, body, sort_order, is_hidden")
    .eq("kind", kind)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Clause[];
}

/** The current published version of an agreement (the visible terms). */
export async function getCurrentAgreement(kind: AgreementKind): Promise<AgreementVersion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agreements")
    .select("id, kind, version, content, published_at")
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as AgreementVersion | null) ?? null;
}
