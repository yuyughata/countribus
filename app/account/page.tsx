import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowRight, LogOut, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReferralCard } from "@/components/account/referral-card";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { logoutAction } from "@/features/auth/actions";
import { getAuthContext } from "@/lib/auth/context";
import { getMyReferral } from "@/features/promotions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Manage account" };

export default async function AccountPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/account");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", ctx.userId)
    .maybeSingle();

  const isOperator = ctx.isPlatformAdmin || ctx.memberships.length > 0;
  const referral = await getMyReferral();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              Your account
            </span>
          </span>
          <h1 className="font-display text-foreground mt-2 text-3xl font-semibold tracking-tight">
            Manage account
          </h1>
        </div>

        {referral && <ReferralCard referral={referral} />}

        <Card className="p-6">
          <dl className="divide-border divide-y text-sm">
            <Row label="Name" value={profile?.full_name || "—"} />
            <Row label="Email" value={profile?.email || ctx.email || "—"} />
            <Row label="Phone" value={profile?.phone || "—"} />
          </dl>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/bookings" className="block">
            <Card className="hover:bg-surface-muted flex items-center justify-between p-4 transition-colors">
              <span className="flex items-center gap-2.5 font-medium">
                <Ticket className="text-primary size-4" /> My bookings
              </span>
              <ArrowRight className="text-subtle size-4" />
            </Card>
          </Link>
          {isOperator && (
            <Link href="/dashboard" className="block">
              <Card className="hover:bg-surface-muted flex items-center justify-between p-4 transition-colors">
                <span className="font-medium">Operator portal</span>
                <ArrowRight className="text-subtle size-4" />
              </Card>
            </Link>
          )}
        </div>

        <form action={logoutAction} className="pt-1">
          <Button type="submit" variant="outline" className="w-full gap-2 sm:w-auto">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
