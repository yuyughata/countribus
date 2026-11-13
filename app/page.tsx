import Link from "next/link";

import { ArrowRight, MapPin, ShieldCheck, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <span className="text-foreground text-lg font-bold tracking-tight">
          countri<span className="text-primary">bus</span>
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Dashboard preview
            </Button>
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="bg-primary-soft text-primary rounded-full px-3 py-1 text-xs font-medium">
          Nigerian Intercity Bus Marketplace
        </span>
        <h1 className="text-foreground mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Book intercity journeys across Nigeria, from operators you can trust.
        </h1>
        <p className="text-muted mt-4 max-w-xl text-base">
          Live seat availability, secure online payments, per-passenger luggage tags and electronic
          tickets — one marketplace, every verified operator.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="md" className="gap-2">
            Search journeys <ArrowRight className="size-4" />
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="md">
              View dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-10 sm:grid-cols-3">
        {[
          {
            icon: MapPin,
            title: "Nationwide coverage",
            body: "36 states and the FCT, with searchable terminals and routes.",
          },
          {
            icon: Ticket,
            title: "Concurrency-safe seats",
            body: "Temporary holds and atomic booking — a seat is never double-sold.",
          },
          {
            icon: ShieldCheck,
            title: "Verified payments",
            body: "Paystack & Flutterwave with webhook-confirmed bookings.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="border-border bg-surface rounded-lg border p-5">
            <span className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-md">
              <Icon className="size-5" />
            </span>
            <h2 className="text-foreground mt-3 text-sm font-semibold">{title}</h2>
            <p className="text-muted mt-1 text-sm">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-border text-subtle border-t py-6 text-center text-xs">
        Countribus · Phase 0 foundation · Design language recreated from the product brief
      </footer>
    </main>
  );
}
