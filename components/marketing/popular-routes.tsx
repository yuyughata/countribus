"use client";

import { useRef } from "react";
import Link from "next/link";

import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PopularRoute } from "@/features/search/queries";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

export function PopularRoutes({ routes }: { routes: PopularRoute[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  if (routes.length === 0) return null;

  function scrollBy(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              Frequently travelled
            </span>
          </span>
          <h2 className="font-display text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Popular Routes
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <SliderButton label="Scroll left" onClick={() => scrollBy(-1)}>
            <ChevronLeft className="size-5" />
          </SliderButton>
          <SliderButton label="Scroll right" onClick={() => scrollBy(1)}>
            <ChevronRight className="size-5" />
          </SliderButton>
        </div>
      </div>

      <div
        ref={scroller}
        className="mt-8 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {routes.map((r) => (
          <article
            key={r.schedule_id}
            className="border-border bg-surface flex w-[270px] shrink-0 snap-start flex-col rounded-2xl border p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center justify-between">
              <span className="bg-primary-soft text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <MapPin className="size-3.5" /> Intercity
              </span>
              <span className="text-subtle text-xs">{r.available_seats} seats</span>
            </div>

            <h3 className="font-display text-foreground mt-4 text-xl font-semibold tracking-tight">
              {r.origin_city} <span className="text-accent-strong">→</span> {r.destination_city}
            </h3>
            <p className="text-muted mt-1 line-clamp-1 text-xs">
              {r.origin_terminal} → {r.destination_terminal}
            </p>

            <div className="text-muted mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> {fmtDate(r.departure_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> {fmtTime(r.departure_at)}
              </span>
            </div>

            <div className="border-border mt-4 flex items-end justify-between border-t pt-4">
              <div>
                <p className="text-foreground text-lg font-semibold">
                  {r.base_fare_kobo ? formatKobo(r.base_fare_kobo) : "—"}
                </p>
                <p className="text-subtle text-xs">per seat</p>
              </div>
              <Link href={`/book/${r.schedule_id}`}>
                <Button size="sm" className="gap-1">
                  Book now <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SliderButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted flex size-10 items-center justify-center rounded-full border transition-colors",
      )}
    >
      {children}
    </button>
  );
}
