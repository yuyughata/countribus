import { DashboardHeader } from "@/components/dashboard/page-header";
import { HeroImagesManager } from "@/components/dashboard/hero-images-manager";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { listAllHeroImages } from "@/features/hero/queries";

export const metadata = { title: "Homepage slider" };

export default async function HomepageSliderPage() {
  await requireDashboardCapability("platform:manage");
  const images = await listAllHeroImages();

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Marketing"
        title="Homepage slider"
        subtitle="Upload and order the photos that rotate behind the homepage hero. Hidden images stay saved but don't show."
      />
      <HeroImagesManager images={images} />
    </div>
  );
}
