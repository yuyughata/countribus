import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Luggage,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { HeroScene } from "@/components/marketing/hero-scene";
import { HeroSearch } from "@/components/marketing/hero-search";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { listTerminalOptionsPublic } from "@/features/search/queries";
import { listActiveHeroImages } from "@/features/hero/queries";

export default async function Home() {
  const [terminals, heroImages] = await Promise.all([
    listTerminalOptionsPublic().catch(() => []),
    listActiveHeroImages().catch(() => []),
  ]);

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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-ink/85 via-brand-ink/50 to-brand-ink/15" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-4 pb-14 sm:px-6 sm:pb-20">
          <SiteHeader tone="light" />

          <div className="max-w-2xl pt-12 pb-9 sm:pt-20 sm:pb-12">
            <span className="border-accent/40 text-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide sm:text-xs">
              <span className="bg-accent size-1.5 rounded-full" />
              Nigeria&apos;s intercity bus marketplace
            </span>
            <h1 className="font-display mt-5 text-balance text-3xl leading-[1.08] font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Intercity booking has never been easier.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-sm text-white/80 sm:text-base">
              Search easily, book conveniently, pay securely — all from your phone. No hassle, no
              stress; just walk in to the terminal to board and be on your way.
            </p>
          </div>

          <HeroSearch terminals={terminals} />
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionEyebrow>Why Countribus</SectionEyebrow>
        <h2 className="font-display text-foreground mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          A premium way to move between cities.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "Nationwide coverage",
              body: "Search direct departures from verified terminals in all 36 states and the FCT.",
            },
            {
              icon: Ticket,
              title: "Pick your exact seat",
              body: "A live, concurrency-safe seat map — your chosen seat is held while you pay, never double-sold.",
            },
            {
              icon: ShieldCheck,
              title: "Pay securely with Paystack",
              body: "Checkout with cards, bank transfer or USSD. Your payment is verified before your seat is confirmed — no surprises.",
            },
            {
              icon: Luggage,
              title: "Luggage, handled",
              body: "Declare bags up front with per-passenger allowances and clear fees — tagged and tracked.",
            },
            {
              icon: QrCode,
              title: "Electronic tickets",
              body: "A scannable QR e-ticket per passenger, verified at the terminal on boarding.",
            },
            {
              icon: BadgeCheck,
              title: "Vetted operators",
              body: "Every operator is reviewed and approved before a single seat goes on sale.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group border-border bg-surface hover:shadow-[var(--shadow-lift)] rounded-xl border p-6 transition-shadow"
            >
              <span className="bg-accent-soft text-accent-strong ring-accent/20 flex size-11 items-center justify-center rounded-xl ring-1">
                <Icon className="size-5" />
              </span>
              <h3 className="text-foreground mt-4 text-base font-semibold">{title}</h3>
              <p className="text-muted mt-1.5 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- How it works */}
      <section className="border-border bg-surface-muted/50 border-y">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionEyebrow>Three steps</SectionEyebrow>
          <h2 className="font-display text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Booked before your coffee&apos;s cold.
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              [Search, "Search", "Enter your cities and date to see every direct departure, with live fares and seats."],
              [Ticket, "Select & hold", "Choose your exact seats on a live map — they're held for 10 minutes while you check out."],
              [CreditCard, "Pay & board", "Pay securely and receive your QR e-ticket by email, SMS and WhatsApp. Scan to board."],
            ].map(([Icon, title, body], i) => {
              const I = Icon as typeof Search;
              return (
                <div key={title as string} className="relative">
                  <span className="font-display text-accent/35 text-5xl font-semibold">
                    0{i + 1}
                  </span>
                  <span className="bg-brand-ink absolute top-1 left-12 flex size-9 items-center justify-center rounded-lg text-white">
                    <I className="size-4" />
                  </span>
                  <h3 className="text-foreground mt-4 text-lg font-semibold">{title as string}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{body as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Operator CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="bg-ink-gradient shadow-[var(--shadow-lift)] relative overflow-hidden rounded-2xl px-8 py-14 text-white sm:px-14">
          <div className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(200,161,92,0.18),transparent_70%)]" />
          <div className="relative max-w-xl">
            <SectionEyebrow light>For operators</SectionEyebrow>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Put your fleet in front of the whole country.
            </h2>
            <p className="mt-4 text-white/70">
              Manage vehicles, seat layouts, routes and departures; sell with live inventory,
              instant settlement reporting and manifests built for the terminal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/vendors/new">
                <Button variant="accent" size="lg" className="gap-2">
                  List your fleet <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                >
                  Explore the portal
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

function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
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
