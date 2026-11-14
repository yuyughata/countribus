import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { CommissionForm } from "@/components/dashboard/commission-form";
import { PayoutAccountForm } from "@/components/dashboard/payout-account-form";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { firstManageableVendorId } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getVendorPayoutAccount } from "@/features/payouts/queries";
import { listBanks } from "@/lib/payments/paystack-transfers";

export const metadata = { title: "Org settings" };

async function currentPlatformCommissionPercent(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("commission_rules")
    .select("rate_bps, effective_from")
    .eq("scope", "platform")
    .is("vendor_id", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.rate_bps ?? 1000) / 100;
}

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

  // Platform admins (no managed operator) get platform-wide settings, including
  // the marketplace commission percentage.
  if (ctx.isPlatformAdmin && !vendorId) {
    const commissionPercent = await currentPlatformCommissionPercent();
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader
          eyebrow="Configuration"
          title="Platform settings"
          subtitle="Marketplace-wide configuration."
        />

        <Card>
          <CardHeader>
            <CardTitle>Marketplace commission</CardTitle>
            <Badge tone="primary">{commissionPercent}% current</Badge>
          </CardHeader>
          <CardContent>
            <CommissionForm currentPercent={commissionPercent} />
          </CardContent>
        </Card>

        <Card className="text-muted p-5 text-sm">
          Other platform configuration (payment providers, messaging, environment secrets) is
          managed in deployment settings and the operations runbook.
        </Card>
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader eyebrow="Configuration" title="Org settings" subtitle="Settings." />
        <Card className="text-muted p-5 text-sm">
          Operator settings are managed by your operator&apos;s owner.
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: v }, commissionPercent, payoutAccount, banks] = await Promise.all([
    supabase
      .from("vendors")
      .select("name, slug, status, contact_email, contact_phone, created_at")
      .eq("id", vendorId)
      .maybeSingle(),
    currentPlatformCommissionPercent(),
    getVendorPayoutAccount(vendorId),
    listBanks(),
  ]);

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
          <Row label="Platform commission" value={`${commissionPercent}%`} />
          <Row
            label="Member since"
            value={v?.created_at ? new Date(v.created_at).toLocaleDateString("en-NG") : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout account</CardTitle>
          <Badge tone="neutral">Settlement</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-muted mb-4 text-sm">
            Where Countribus settles your earnings. Paid bookings are paid out to this account
            automatically, within 24 hours, via Paystack.
          </p>
          <PayoutAccountForm banks={banks} initial={payoutAccount} />
        </CardContent>
      </Card>

      <p className="text-subtle text-xs">
        To change your operator name, branding or commission terms, contact Countribus support —
        these are reviewed to keep the marketplace trustworthy.
      </p>
    </div>
  );
}
