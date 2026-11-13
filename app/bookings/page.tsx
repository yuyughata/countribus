import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/context";
import { formatKobo } from "@/lib/money";
import { listMyBookings } from "@/features/booking/account";

export const metadata = { title: "My bookings" };

const tone: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  pending_payment: "warning",
  paid: "success",
  cancelled: "danger",
  refunded: "neutral",
  failed: "danger",
  expired: "neutral",
};

export default async function MyBookingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/bookings");
  const bookings = await listMyBookings(ctx.userId);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-foreground text-lg font-bold tracking-tight">
          countri<span className="text-primary">bus</span>
        </Link>
        <Link href="/search" className="text-primary text-sm font-medium">
          Book a journey
        </Link>
      </header>
      <h1 className="text-foreground text-xl font-semibold">My bookings</h1>

      {bookings.length === 0 ? (
        <Card className="text-muted p-8 text-center text-sm">
          No bookings yet.{" "}
          <Link href="/search" className="text-primary font-medium">
            Find a journey
          </Link>
          .
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link key={b.id} href={`/bookings/${b.reference}`}>
              <Card className="hover:bg-surface-muted flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-semibold">{b.reference}</p>
                    <Badge tone={tone[b.status] ?? "neutral"}>{b.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-muted text-xs">
                    {b.passenger_count} passenger{b.passenger_count === 1 ? "" : "s"} ·{" "}
                    {b.schedules ? new Date(b.schedules.departure_at).toLocaleString("en-NG") : ""}
                  </p>
                </div>
                <p className="text-foreground text-sm font-semibold">
                  {formatKobo(b.grand_total_kobo)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
