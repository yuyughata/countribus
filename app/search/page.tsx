import Link from "next/link";

import { ArrowRight, Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchForm } from "@/components/search/search-form";
import { formatKobo } from "@/lib/money";
import { listTerminalOptionsPublic, searchJourneys } from "@/features/search/queries";

export const metadata = { title: "Search journeys" };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const terminals = await listTerminalOptionsPublic();
  const hasQuery = sp.origin && sp.dest && sp.date;
  const results = hasQuery
    ? await searchJourneys({
        origin: sp.origin!,
        dest: sp.dest!,
        date: sp.date!,
        pax: Number(sp.pax ?? "1"),
        category: sp.category,
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-foreground text-lg font-bold tracking-tight">
          countri<span className="text-primary">bus</span>
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Find your journey</h1>
        <p className="text-muted text-sm">
          Search direct intercity departures from verified operators.
        </p>
      </div>

      <SearchForm
        terminals={terminals}
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
            {results.length} journey{results.length === 1 ? "" : "s"} found
          </p>
          {results.map((r) => (
            <Card
              key={r.schedule_id}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-semibold">{r.vendor_name}</p>
                  {r.category_key && (
                    <Badge tone="neutral">{r.category_key.replace("_", " ")}</Badge>
                  )}
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
                    Select seats <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
          {results.length === 0 && (
            <Card className="text-muted p-8 text-center text-sm">
              No journeys match. Try another date or route.
            </Card>
          )}
        </section>
      )}
    </main>
  );
}
