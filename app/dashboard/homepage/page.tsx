import Link from "next/link";

import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { HeroImagesManager } from "@/components/dashboard/hero-images-manager";
import { HeroTextEditor } from "@/components/dashboard/content/hero-text-editor";
import { ListSectionEditor } from "@/components/dashboard/content/list-section-editor";
import { OperatorCtaEditor } from "@/components/dashboard/content/operator-cta-editor";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { listAllHeroImages } from "@/features/hero/queries";
import { getHomepageContent } from "@/features/content/queries";

export const metadata = { title: "Homepage content" };

export default async function HomepagePage() {
  await requireDashboardCapability("platform:manage");
  const [images, content] = await Promise.all([listAllHeroImages(), getHomepageContent()]);

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Marketing"
        title="Homepage content"
        subtitle="Edit every section of the public homepage. Changes are live immediately."
        action={
          <Link href="/" target="_blank">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="size-4" /> View homepage
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Hero text</CardTitle>
        </CardHeader>
        <CardContent>
          <HeroTextEditor initial={content.hero} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hero photo slider</CardTitle>
        </CardHeader>
        <CardContent>
          <HeroImagesManager images={images} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature cards</CardTitle>
        </CardHeader>
        <CardContent>
          <ListSectionEditor sectionKey="features" initial={content.features} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ListSectionEditor sectionKey="how" initial={content.how} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operator banner</CardTitle>
        </CardHeader>
        <CardContent>
          <OperatorCtaEditor initial={content.operator} />
        </CardContent>
      </Card>
    </div>
  );
}
