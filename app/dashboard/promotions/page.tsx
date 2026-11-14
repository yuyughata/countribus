import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { PromoCodesManager } from "@/components/dashboard/promotions/promo-codes-manager";
import { ReferralProgramEditor } from "@/components/dashboard/promotions/referral-program-editor";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getReferralProgram, listPromoCodes } from "@/features/promotions/queries";

export const metadata = { title: "Promotions & referrals" };

export default async function PromotionsPage() {
  await requireDashboardCapability("platform:manage");
  const [codes, program] = await Promise.all([listPromoCodes(), getReferralProgram()]);

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Growth"
        title="Promotions & referrals"
        subtitle="Create promo codes and configure the customer referral program."
      />

      <Card>
        <CardHeader>
          <CardTitle>Promo codes</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodesManager codes={codes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral program</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralProgramEditor initial={program} />
        </CardContent>
      </Card>
    </div>
  );
}
