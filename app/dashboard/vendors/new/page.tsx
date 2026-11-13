import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { VendorOnboardingForm } from "@/components/vendors/vendor-onboarding-form";

export const metadata = { title: "New operator" };

export default function NewVendorPage() {
  return (
    <div className="mx-auto max-w-lg space-y-5 p-5">
      <Link
        href="/dashboard/vendors"
        className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to vendors
      </Link>
      <div>
        <h2 className="text-foreground text-xl font-semibold">Onboard your transport business</h2>
        <p className="text-muted text-sm">
          Tell us about your operation. Once approved you can add vehicles, routes and schedules.
        </p>
      </div>
      <Card>
        <CardContent>
          <VendorOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
