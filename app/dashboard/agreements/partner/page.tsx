import { ClauseEditor } from "@/components/dashboard/agreements/clause-editor";
import { CountersignPanel } from "@/components/dashboard/agreements/countersign-panel";
import { NotifyOperatorsCard } from "@/components/dashboard/agreements/notify-operators-card";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getCurrentAgreement, listClauses } from "@/features/agreements/queries";
import {
  getPartnerAnnounceState,
  listPendingCountersignatures,
} from "@/features/agreements/vendor-queries";

export const metadata = { title: "Partner agreement" };

export default async function PartnerAgreementPage() {
  await requireDashboardCapability("platform:manage");
  const [clauses, current, pending, announce] = await Promise.all([
    listClauses("partner"),
    getCurrentAgreement("partner"),
    listPendingCountersignatures(),
    getPartnerAnnounceState(),
  ]);
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        The terms every operator accepts when they apply (<code>/apply</code>) and again in their
        dashboard (Agreements → sign). Add, edit, reorder or hide clauses. Separate paragraphs with
        a blank line. Any change counts as a new version — operators who accepted an older one are
        asked to sign again.
        {current && (
          <>
            {" "}
            <span className="text-foreground font-medium">Current: v{current.version}</span> · last
            changed {new Date(current.published_at).toLocaleString("en-NG")}.
          </>
        )}
      </p>
      {announce.current && (
        <NotifyOperatorsCard
          version={announce.current.version}
          announcedAt={announce.announcedAt}
          operatorCount={announce.operatorCount}
          signedCount={announce.signedCount}
        />
      )}
      <CountersignPanel pending={pending} />
      <ClauseEditor kind="partner" clauses={clauses} />
    </div>
  );
}
