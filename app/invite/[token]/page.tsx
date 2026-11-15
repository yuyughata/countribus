import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { AcceptInvite } from "@/components/invite/accept-invite";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { VENDOR_ROLE_LABEL } from "@/lib/permissions/role-labels";
import type { VendorRole } from "@/lib/supabase/database.types";

export const metadata = { title: "Team invitation" };

type Preview = {
  vendor_name: string;
  role: VendorRole;
  email: string;
  status: string;
  expired: boolean;
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect(`/login?next=/invite/${token}`);

  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_preview", { p_token: token });
  const preview = ((data ?? [])[0] as Preview | undefined) ?? null;

  let message: string | null = null;
  if (!preview) message = "This invitation link is not valid.";
  else if (preview.status === "accepted") message = "This invitation has already been accepted.";
  else if (preview.status === "revoked") message = "This invitation has been revoked.";
  else if (preview.expired) message = "This invitation has expired. Ask the operator to resend it.";
  else if ((ctx.email ?? "").toLowerCase() !== preview.email)
    message = `This invitation is for ${preview.email}. Sign in with that email address to accept.`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md space-y-5 px-4 py-10 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              Invitation
            </span>
          </span>
          <h1 className="font-display text-foreground mt-2 text-2xl font-semibold tracking-tight">
            Join the team
          </h1>
        </div>
        <Card>
          <CardContent className="p-5">
            {preview && !message ? (
              <AcceptInvite
                token={token}
                vendorName={preview.vendor_name}
                roleLabel={VENDOR_ROLE_LABEL[preview.role]}
              />
            ) : (
              <p className="text-muted text-sm">{message}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
