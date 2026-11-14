import {
  BarChart3,
  Bus,
  CalendarClock,
  FileSignature,
  Image as ImageIcon,
  LayoutDashboard,
  Luggage,
  MapPin,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
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
  { href: "/dashboard/homepage", label: "Homepage content", icon: ImageIcon },
  { href: "/dashboard/promotions", label: "Promotions & referrals", icon: Tag },
  { href: "/dashboard/communications", label: "Communications", icon: Megaphone },
  { href: "/dashboard/agreements", label: "Agreements", icon: FileSignature },
  { href: "/dashboard/activity", label: "Activity log", icon: ScrollText },
  { href: "/dashboard/permissions", label: "Admin & permissions", icon: Settings },
  { href: "/dashboard/agreement", label: "Partner agreement", icon: FileSignature },
  { href: "/dashboard/settings", label: "Org settings", icon: Settings },
  { href: "/dashboard/profile", label: "Personal profile", icon: UserCircle },
];
