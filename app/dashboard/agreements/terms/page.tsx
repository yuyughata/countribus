import { ClauseEditor } from "@/components/dashboard/agreements/clause-editor";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getCurrentAgreement, listClauses } from "@/features/agreements/queries";

export const metadata = { title: "Terms & conditions" };

export default async function TermsPage() {
  await requireDashboardCapability("platform:manage");
  const [clauses, current] = await Promise.all([
    listClauses("terms"),
    getCurrentAgreement("terms"),
  ]);
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        The Terms &amp; Conditions shown on the public <code>/terms</code> page and linked at
        checkout. Add, edit, reorder or hide clauses. Any change counts as a new version.
        {current && (
          <>
            {" "}
            <span className="text-foreground font-medium">Current: v{current.version}</span> · last
            changed {new Date(current.published_at).toLocaleString("en-NG")}.
          </>
        )}
      </p>
      <ClauseEditor kind="terms" clauses={clauses} />
    </div>
  );
}
