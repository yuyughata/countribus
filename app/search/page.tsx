import Link from "next/link";

import { ArrowRight, Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchForm } from "@/components/search/search-form";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { formatKobo } from "@/lib/money";
import {
  listBookableRoutes,
  searchAlternativeJourneys,
  searchJourneys,
  type JourneyResult,
} from "@/features/search/queries";

export const metadata = { title: "Search journeys" };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function JourneyCard({ r }: { r: JourneyResult }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-foreground font-semibold">{r.vendor_name}</p>
          {r.category_key && <Badge tone="neutral">{r.category_key.replace("_", " ")}</Badge>}
        </div>
        <p className="text-muted mt-1 flex items-center gap-1 text-sm">
          <MapPin className="size-3.5" /> {r.origin_name} → {r.destination_name}
        </p>
        <p className="text-muted flex items-center gap-1 text-sm">
          <Clock className="size-3.5" /> {fmtTime(r.departure_at)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-foreground text-lg font-semibold">
          {r.base_fare_kobo ? formatKobo(r.base_fare_kobo) : "—"}
        </p>
        <p className="text-muted text-xs">{r.available_seats} seats left</p>
        <Link href={`/book/${r.schedule_id}`} className="mt-2 inline-block">
          <Button size="sm" className="gap-1">
            Book Now <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const routes = await listBookableRoutes();
  const hasQuery = sp.origin && sp.dest && sp.date;
  const pax = Number(sp.pax ?? "1");
  const [results, alternatives] = hasQuery
    ? await Promise.all([
        searchJourneys({
          origin: sp.origin!,
          dest: sp.dest!,
          date: sp.date!,
          pax,
          category: sp.category,
        }),
        searchAlternativeJourneys({ origin: sp.origin!, dest: sp.dest!, date: sp.date!, pax }),
      ])
    : [[], []];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              Plan your trip
            </span>
          </span>
          <h1 className="font-display text-foreground mt-2 text-3xl font-semibold tracking-tight">
            Find your journey
          </h1>
          <p className="text-muted mt-1 text-sm">
            Search direct intercity departures from verified operators.
          </p>
        </div>

        <SearchForm
          routes={routes}
          initial={{
            origin: sp.origin,
            dest: sp.dest,
            date: sp.date,
            pax: sp.pax,
            category: sp.category,
          }}
        />

        {hasQuery && (
          <section className="space-y-3">
            <p className="text-muted text-sm">
              {results.length} journey{results.length === 1 ? "" : "s"} found for your search
            </p>
            {results.map((r) => (
              <JourneyCard key={r.schedule_id} r={r} />
            ))}
            {results.length === 0 && (
              <Card className="text-muted p-8 text-center text-sm">
                No direct journeys match your exact search.
                {alternatives.length > 0
                  ? " See other routes below."
                  : " Try another date or route."}
              </Card>
            )}
          </section>
        )}

        {hasQuery && alternatives.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
                Other routes
              </h2>
              <p className="text-muted text-sm">
                Closer departures and alternatives from{" "}
                {results[0]?.origin_name ?? alternatives[0]?.origin_name}.
              </p>
            </div>
            {alternatives.map((r) => (
              <JourneyCard key={r.schedule_id} r={r} />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
