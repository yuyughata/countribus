import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { firstManageableVendorId } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Org settings" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <span className="text-subtle">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const ctx = await requireDashboardCapability("vendor:manage_own");
  const vendorId = firstManageableVendorId(ctx);

  if (!vendorId) {
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader eyebrow="Configuration" title="Org settings" subtitle="Platform configuration." />
        <Card className="text-muted p-5 text-sm">
          You&apos;re signed in as a platform admin. Operator settings are managed per operator by
          their owner. Platform-wide configuration (payments, messaging, environment) is managed in
          deployment settings.
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vendors")
    .select("name, slug, status, contact_email, contact_phone, commission_rate_bps, created_at")
    .eq("id", vendorId)
    .maybeSingle();

  const tone =
    v?.status === "approved" ? "success" : v?.status === "pending" ? "warning" : "danger";

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Configuration"
        title="Org settings"
        subtitle="Your operator profile on Countribus."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {v?.name ?? "Operator"} <Badge tone={tone}>{v?.status ?? "—"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-border divide-y p-0">
          <Row label="Public URL" value={`/v/${v?.slug ?? ""}`} />
          <Row label="Contact email" value={v?.contact_email ?? "—"} />
          <Row label="Contact phone" value={v?.contact_phone ?? "—"} />
          <Row
            label="Platform commission"
            value={v?.commission_rate_bps != null ? `${(v.commission_rate_bps / 100).toFixed(1)}%` : "Platform default"}
          />
          <Row
            label="Member since"
            value={v?.created_at ? new Date(v.created_at).toLocaleDateString("en-NG") : "—"}
          />
        </CardContent>
      </Card>

      <p className="text-subtle text-xs">
        To change your operator name, branding or commission terms, contact Countribus support —
        these are reviewed to keep the marketplace trustworthy.
      </p>
    </div>
  );
}
