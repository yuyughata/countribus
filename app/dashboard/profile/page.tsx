import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Personal profile" };

const ROLE_LABEL: Record<string, string> = {
  vendor_owner: "Vendor Owner",
  vendor_manager: "Vendor Manager",
  booking_officer: "Booking Officer",
  terminal_staff: "Terminal Staff",
  luggage_officer: "Luggage Officer",
  finance_officer: "Finance Officer",
};

export default async function ProfilePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", ctx.userId)
    .maybeSingle();

  const roles = ctx.isPlatformAdmin
    ? ["Super Admin (platform)"]
    : ctx.memberships.map((m) => ROLE_LABEL[m.role] ?? m.role);

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader eyebrow="Account" title="Personal profile" subtitle="Your details and access." />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-subtle text-[11px] font-semibold tracking-wide uppercase">Email</p>
              <p className="text-foreground">{profile?.email ?? ctx.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-subtle text-[11px] font-semibold tracking-wide uppercase">Roles</p>
              <ul className="mt-1 space-y-1">
                {roles.length === 0 ? (
                  <li className="text-muted">Passenger</li>
                ) : (
                  roles.map((r) => (
                    <li key={r} className="text-foreground">
                      {r}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <p className="text-subtle text-xs">
              Need a different role? Your operator owner or a platform admin manages access under
              Admin &amp; permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
