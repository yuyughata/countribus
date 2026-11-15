"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Mail, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldClass as field } from "@/components/ui/field";
import { inviteMember, revokeInvite, setStaffRole } from "@/features/team/actions";
import type { PendingInvite, TeamMember } from "@/features/team/queries";
import {
  ASSIGNABLE_ROLES,
  INVITABLE_ROLES,
  VENDOR_ROLE_LABEL,
} from "@/lib/permissions/role-labels";
import type { VendorRole } from "@/lib/supabase/database.types";

export function TeamManager({
  vendorId,
  staff,
  invites,
  canAssignOwner,
}: {
  vendorId: string;
  staff: TeamMember[];
  invites: PendingInvite[];
  canAssignOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<VendorRole>("booking_officer");

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setNote(null);
    start(async () => {
      const r = await fn();
      setNote({
        ok: r.ok,
        text: r.ok ? (r.message ?? "Done.") : (r.error ?? "Something went wrong"),
      });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {note && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${note.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
        >
          {note.text}
        </p>
      )}

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <Badge tone="neutral">{staff.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <p className="text-muted p-6 text-sm">No staff yet. Invite someone below.</p>
          ) : (
            <div className="divide-border divide-y">
              {staff.map((s) => {
                const lockedOwner = s.role === "vendor_owner" && !canAssignOwner;
                return (
                  <div
                    key={s.user_id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {s.full_name ?? "Team member"}
                      </p>
                      <p className="text-subtle truncate text-xs">{s.email ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!s.is_active && <Badge tone="danger">inactive</Badge>}
                      <select
                        className={`${field} h-9 w-[160px] py-1 text-sm`}
                        aria-label={`Role for ${s.full_name ?? s.email ?? "member"}`}
                        value={s.role}
                        disabled={pending || lockedOwner}
                        onChange={(e) =>
                          run(() => setStaffRole(vendorId, s.user_id, e.target.value as VendorRole))
                        }
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option
                            key={r}
                            value={r}
                            disabled={r === "vendor_owner" && !canAssignOwner}
                          >
                            {VENDOR_ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle>Invite a team member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted text-sm">
            Send an email invite. They sign in (or create an account) with that email to join with
            the role you pick.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto]">
            <input
              className={field}
              type="email"
              inputMode="email"
              placeholder="name@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className={field}
              aria-label="Invite role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as VendorRole)}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {VENDOR_ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={pending || !inviteEmail.trim()}
              onClick={() =>
                run(async () => {
                  const r = await inviteMember(vendorId, inviteEmail, inviteRole);
                  if (r.ok) setInviteEmail("");
                  return r;
                })
              }
              className="gap-1.5"
            >
              <Mail className="size-4" /> Send invite
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="border-border mt-2 space-y-2 border-t pt-3">
              <p className="text-subtle text-xs font-semibold tracking-wide uppercase">
                Pending invitations
              </p>
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="text-foreground truncate font-medium">{inv.email}</span>{" "}
                    <Badge tone="primary">{VENDOR_ROLE_LABEL[inv.role]}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-subtle text-xs">
                      expires {new Date(inv.expires_at).toLocaleDateString("en-NG")}
                    </span>
                    <button
                      type="button"
                      className="text-subtle hover:text-danger inline-flex items-center gap-1 text-xs"
                      disabled={pending}
                      onClick={() => run(() => revokeInvite(inv.id))}
                    >
                      <X className="size-3.5" /> Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invites.length === 0 && (
            <p className="text-subtle flex items-center gap-1.5 text-xs">
              <Plus className="size-3.5" /> No pending invitations.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
