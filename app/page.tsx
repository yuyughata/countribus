import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { HeroScene } from "@/components/marketing/hero-scene";
import { HeroSearch } from "@/components/marketing/hero-search";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { PopularRoutes } from "@/components/marketing/popular-routes";
import { listPopularRoutes, listTerminalOptionsPublic } from "@/features/search/queries";
import { listActiveHeroImages } from "@/features/hero/queries";
import { getHomepageContent } from "@/features/content/queries";
import { iconFor, DEFAULT_HOMEPAGE } from "@/lib/content/homepage";

export default async function Home() {
  const [terminals, heroImages, content, popularRoutes] = await Promise.all([
    listTerminalOptionsPublic().catch(() => []),
    listActiveHeroImages().catch(() => []),
    getHomepageContent().catch(() => DEFAULT_HOMEPAGE),
    listPopularRoutes(8).catch(() => []),
  ]);
  const { hero, features, how, operator } = content;

  return (
    <main className="min-h-full">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative isolate overflow-hidden">
        {heroImages.length > 0 ? (
          <HeroCarousel images={heroImages} />
        ) : (
          <HeroScene className="absolute inset-0 size-full" />
        )}
        {/* Legibility scrims (don't block the search widget) */}
        <div className="from-brand-ink/85 via-brand-ink/50 to-brand-ink/15 pointer-events-none absolute inset-0 bg-gradient-to-br" />
        <div className="from-canvas pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-4 pb-14 sm:px-6 sm:pb-20">
          <SiteHeader tone="light" />

          <div className="max-w-2xl pt-12 pb-9 sm:pt-20 sm:pb-12">
            <span className="border-accent/40 text-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide sm:text-xs">
              <span className="bg-accent size-1.5 rounded-full" />
              {hero.eyebrow}
            </span>
            <h1 className="font-display mt-5 text-3xl leading-[1.08] font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.4rem]">
              {hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-pretty text-white/80 sm:text-base">
              {hero.subtitle}
            </p>
          </div>

          <HeroSearch terminals={terminals} />
        </div>
      </section>

      {/* ------------------------------------------------------- Popular Routes */}
      <PopularRoutes routes={popularRoutes} />

      {/* ------------------------------------------------------------ Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionEyebrow>{features.eyebrow}</SectionEyebrow>
        <h2 className="font-display text-foreground mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {features.heading}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((item, idx) => {
            const Icon = iconFor(item.icon);
            return (
              <div
                key={idx}
                className="group border-border bg-surface rounded-xl border p-6 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <span className="bg-accent-soft text-accent-strong ring-accent/20 flex size-11 items-center justify-center rounded-xl ring-1">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-foreground mt-4 text-base font-semibold">{item.title}</h3>
                <p className="text-muted mt-1.5 text-sm leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------------- How it works */}
      <section className="border-border bg-surface-muted/50 border-y">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionEyebrow>{how.eyebrow}</SectionEyebrow>
          <h2 className="font-display text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {how.heading}
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {how.items.map((item, i) => {
              const Icon = iconFor(item.icon);
              return (
                <div key={i} className="relative">
                  <span className="font-display text-accent/35 text-5xl font-semibold">
                    0{i + 1}
                  </span>
                  <span className="bg-brand-ink absolute top-1 left-12 flex size-9 items-center justify-center rounded-lg text-white">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="text-foreground mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Operator CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="bg-ink-gradient relative overflow-hidden rounded-2xl px-8 py-14 text-white shadow-[var(--shadow-lift)] sm:px-14">
          <div className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(200,161,92,0.18),transparent_70%)]" />
          <div className="relative max-w-xl">
            <SectionEyebrow light>{operator.eyebrow}</SectionEyebrow>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {operator.heading}
            </h2>
            <p className="mt-4 text-white/70">{operator.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={operator.primaryHref}>
                <Button variant="accent" size="lg" className="gap-2">
                  {operator.primaryLabel} <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href={operator.secondaryHref}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                >
                  {operator.secondaryLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SectionEyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="rule-gold" />
      <span
        className={
          "text-[11px] font-semibold tracking-widest uppercase " +
          (light ? "text-accent" : "text-accent-strong")
        }
      >
        {children}
      </span>
    </span>
  );
}
