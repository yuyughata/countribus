"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Bus,
  Users,
  MapPin,
  CalendarClock,
  Wallet,
  BarChart3,
  Luggage,
  ShieldCheck,
  Settings,
  ScrollText,
  UserCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/vendors", label: "Vendor management", icon: Users },
  { href: "/dashboard/fleet", label: "Fleet", icon: Bus },
  { href: "/dashboard/routes", label: "Route management", icon: MapPin },
  { href: "/dashboard/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/dashboard/finance", label: "Financials", icon: Wallet },
  { href: "/dashboard/reports", label: "Analytics & reporting", icon: BarChart3 },
  { href: "/dashboard/luggage", label: "Luggage & boarding", icon: Luggage },
  { href: "/dashboard/security", label: "Security & compliance", icon: ShieldCheck },
];

const secondaryNav: NavItem[] = [
  { href: "/dashboard/activity", label: "Activity log", icon: ScrollText },
  { href: "/dashboard/permissions", label: "Admin & permissions", icon: Settings },
  { href: "/dashboard/settings", label: "Org settings", icon: Settings },
  { href: "/dashboard/profile", label: "Personal profile", icon: UserCircle },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-active text-foreground font-medium"
          : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-subtle")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="border-border bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-foreground text-lg font-bold tracking-tight">
          countri<span className="text-primary">bus</span>
        </span>
        <span className="bg-primary-soft text-primary ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium">
          Administrator
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <div className="border-border my-3 border-t" />
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
    </aside>
  );
}
