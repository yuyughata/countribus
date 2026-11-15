import { ClauseEditor } from "@/components/dashboard/agreements/clause-editor";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getCurrentAgreement, listClauses } from "@/features/agreements/queries";

export const metadata = { title: "Privacy policy" };

export default async function PrivacyPage() {
  await requireDashboardCapability("platform:manage");
  const [clauses, current] = await Promise.all([
    listClauses("privacy"),
    getCurrentAgreement("privacy"),
  ]);
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        The Privacy Policy shown on the public <code>/privacy</code> page. Add, edit, reorder or
        hide clauses. Any change counts as a new version.
        {current && (
          <>
            {" "}
            <span className="text-foreground font-medium">Current: v{current.version}</span> · last
            changed {new Date(current.published_at).toLocaleString("en-NG")}.
          </>
        )}
      </p>
      <ClauseEditor kind="privacy" clauses={clauses} />
    </div>
  );
}
