import {
  BarChart3,
  Bus,
  CalendarClock,
  LayoutDashboard,
  Luggage,
  MapPin,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/vendors", label: "Vendor management", icon: Users },
  { href: "/dashboard/fleet", label: "Fleet", icon: Bus },
  { href: "/dashboard/routes", label: "Route management", icon: MapPin },
  { href: "/dashboard/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/dashboard/finance", label: "Financials", icon: Wallet },
  { href: "/dashboard/reports", label: "Analytics & reporting", icon: BarChart3 },
  { href: "/dashboard/manifests", label: "Boarding & manifests", icon: Luggage },
  { href: "/dashboard/security", label: "Security & compliance", icon: ShieldCheck },
];

export const secondaryNav: NavItem[] = [
  { href: "/dashboard/activity", label: "Activity log", icon: ScrollText },
  { href: "/dashboard/permissions", label: "Admin & permissions", icon: Settings },
  { href: "/dashboard/settings", label: "Org settings", icon: Settings },
  { href: "/dashboard/profile", label: "Personal profile", icon: UserCircle },
];
