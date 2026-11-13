import {
  Wallet,
  Bus,
  Users,
  UserPlus,
  CheckCircle2,
  ClipboardCheck,
  Route as RouteIcon,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Dashboard" };

// NOTE: seeded demo data for UI development only — clearly separated from
// production records (plan §11 sequencing note). Replaced by live queries in
// later phases.
const revenueTrend = [320, 410, 230, 540, 480, 300, 390, 350, 420, 300, 280, 500];
const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const peakIndex = revenueTrend.indexOf(Math.max(...revenueTrend));

const quickActions = [
  { label: "Approve vendor", icon: CheckCircle2, tone: "info" as const },
  { label: "Add vehicle", icon: Bus, tone: "violet" as const },
  { label: "Create route", icon: RouteIcon, tone: "primary" as const },
  { label: "Send notification", icon: Send, tone: "teal" as const },
];

const pendingApprovals = [
  { name: "Peace Mass Transit", detail: "Vendor application · Enugu" },
  { name: "GUO Transport", detail: "Fleet document review" },
  { name: "ABC Transport", detail: "Payout account change" },
];

const recentActivity = [
  { tone: "bg-success", text: "Booking confirmed · Lagos → Abuja", time: "2m ago" },
  { tone: "bg-info", text: "New vendor registered · God is Good Motors", time: "18m ago" },
  { tone: "bg-warning", text: "Payment exception flagged · ref PSK-2231", time: "41m ago" },
  { tone: "bg-violet", text: "Schedule published · Benin → Port Harcourt", time: "1h ago" },
];

const toneBar: Record<string, string> = {
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  primary: "bg-primary-soft text-primary",
  teal: "bg-teal-soft text-teal",
};

export default function DashboardPage() {
  const maxBar = Math.max(...revenueTrend);

  return (
    <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <h2 className="text-foreground text-xl font-semibold">Welcome back 👋</h2>
          <p className="text-muted text-sm">Here&apos;s an overview of platform activity.</p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Gross booking value"
            value={formatKobo(153413400)}
            icon={<Wallet className="size-4" />}
            tone="primary"
            deltaPct={24.5}
            footer="From Jan 01 – Jul 30, 2024"
          />
          <StatCard
            label="Active trips"
            value="300"
            icon={<Bus className="size-4" />}
            tone="info"
            deltaPct={24.5}
            footer="From Jan 01 – Jul 30, 2024"
          />
          <StatCard
            label="Registered vendors"
            value="1,200"
            icon={<Users className="size-4" />}
            tone="violet"
            deltaPct={-4.5}
            footer="From Jan 01 – Jul 30, 2024"
          />
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-foreground mb-3 text-sm font-semibold">Quick actions</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map(({ label, icon: Icon, tone }) => (
              <button
                key={label}
                type="button"
                className="border-border bg-surface text-foreground hover:bg-surface-muted flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition-colors"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-md ${toneBar[tone]}`}
                >
                  <Icon className="size-4" />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Revenue trend</CardTitle>
              <Badge tone="neutral">Jan 2023 – Jul 2024</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex h-44 gap-2">
                {revenueTrend.map((v, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${(v / maxBar) * 90}%`,
                        backgroundColor:
                          i === peakIndex
                            ? "var(--color-chart-bar-active)"
                            : "var(--color-chart-bar)",
                      }}
                      title={`${months[i]}: ${v}`}
                    />
                    <span className="text-subtle text-[10px]">{months[i]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trip distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-5">
              <div
                className="size-28 rounded-full"
                style={{
                  background:
                    "conic-gradient(var(--color-info) 0 45%, var(--color-primary) 45% 78%, var(--color-danger) 78% 100%)",
                }}
                role="img"
                aria-label="Trip distribution: 45% 18-seater, 33% Coaster, 22% luxury coach"
              >
                <div className="flex size-full items-center justify-center">
                  <div className="bg-surface size-16 rounded-full" />
                </div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className="bg-info size-2.5 rounded-full" /> 18-seater · 45%
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-primary size-2.5 rounded-full" /> Coaster · 33%
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-danger size-2.5 rounded-full" /> Luxury coach · 22%
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right rail */}
      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending approvals <Badge tone="primary">{pendingApprovals.length}</Badge>
            </CardTitle>
            <button className="text-primary text-xs font-medium">See all</button>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {pendingApprovals.map((a) => (
              <div key={a.name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">{a.name}</p>
                  <p className="text-muted truncate text-xs">{a.detail}</p>
                </div>
                <Button size="sm" className="shrink-0">
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="text-muted size-4" /> Recent activity
            </CardTitle>
            <button className="text-primary text-xs font-medium">See all</button>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.tone}`} />
                <div className="min-w-0">
                  <p className="text-foreground text-sm">{item.text}</p>
                  <p className="text-subtle text-xs">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="bg-success-soft text-success flex size-8 items-center justify-center rounded-md">
              <UserPlus className="size-4" />
            </span>
            <div>
              <p className="text-foreground text-sm font-medium">New passengers</p>
              <p className="text-muted text-xs">+320 this week</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
