import { ClauseEditor } from "@/components/dashboard/agreements/clause-editor";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getCurrentAgreement, listClauses } from "@/features/agreements/queries";

export const metadata = { title: "Boarding policy" };

export default async function BoardingPolicyPage() {
  await requireDashboardCapability("platform:manage");
  const [clauses, current] = await Promise.all([
    listClauses("boarding"),
    getCurrentAgreement("boarding"),
  ]);
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        The boarding rules customers agree to when they complete a booking (and that are attached to
        every booking confirmation email). Add, edit, reorder or hide clauses. Any change counts as
        a new version.
        {current && (
          <>
            {" "}
            <span className="text-foreground font-medium">Current: v{current.version}</span> · last
            changed {new Date(current.published_at).toLocaleString("en-NG")}.
          </>
        )}
      </p>
      <ClauseEditor kind="boarding" clauses={clauses} />
    </div>
  );
}
