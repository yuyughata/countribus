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

export default function Home() {
  return (
    <main className="min-h-full">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="bg-ink-gradient relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-[radial-gradient(circle,rgba(200,161,92,0.22),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-5 pb-20 sm:pb-28">
          <SiteHeader tone="light" />

          <div className="mx-auto mt-16 max-w-3xl text-center sm:mt-20">
            <span className="border-accent/40 text-accent inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide">
              <span className="bg-accent size-1.5 rounded-full" />
              Nigeria&apos;s intercity bus marketplace
            </span>
            <h1 className="font-display mt-6 text-balance text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              Travel the country in
              <span className="text-accent"> first class</span>, book it in seconds.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-white/70 sm:text-lg">
              Live seat selection, secure payments and electronic tickets — across every state,
              from operators vetted and verified for your peace of mind.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/search">
                <Button variant="accent" size="lg" className="gap-2">
                  <Search className="size-4" /> Search journeys
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                >
                  Operator portal
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick-search entry card */}
          <Link
            href="/search"
            className="glass shadow-[var(--shadow-lift)] mx-auto mt-14 flex max-w-3xl items-center gap-3 rounded-2xl p-2.5 ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
          >
            <div className="text-muted grid flex-1 grid-cols-1 gap-2 px-2 sm:grid-cols-3">
              <span className="flex items-center gap-2 py-2 text-sm">
                <MapPin className="text-accent-strong size-4" /> From — any city
              </span>
              <span className="border-border flex items-center gap-2 py-2 text-sm sm:border-l sm:pl-4">
                <MapPin className="text-accent-strong size-4" /> To — any city
              </span>
              <span className="border-border flex items-center gap-2 py-2 text-sm sm:border-l sm:pl-4">
                <Ticket className="text-accent-strong size-4" /> Pick your date
              </span>
            </div>
            <span className="bg-primary text-primary-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-xl shadow-[0_6px_18px_rgba(224,126,54,0.3)]">
              <Search className="size-5" />
            </span>
          </Link>

          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-6 border-t border-white/10 pt-8 text-center">
            {[
              ["37", "States & FCT covered"],
              ["Secure", "Pay securely with Paystack"],
              ["0", "Seats ever double-sold"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="font-display text-accent text-3xl font-semibold sm:text-4xl">{n}</dt>
                <dd className="mt-1 text-xs text-white/60 sm:text-sm">{label}</dd>
              </div>
            ))}
          </dl>
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
