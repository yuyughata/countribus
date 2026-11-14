import {
  ArrowRight,
  BadgeCheck,
  Bus,
  CalendarClock,
  CreditCard,
  Luggage,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Icons an admin can pick for homepage cards/steps. */
export const ICONS = {
  "map-pin": MapPin,
  ticket: Ticket,
  "shield-check": ShieldCheck,
  luggage: Luggage,
  "qr-code": QrCode,
  "badge-check": BadgeCheck,
  search: Search,
  "credit-card": CreditCard,
  bus: Bus,
  users: Users,
  wallet: Wallet,
  calendar: CalendarClock,
  sparkles: Sparkles,
  "arrow-right": ArrowRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export const ICON_OPTIONS: { value: IconName; label: string }[] = (
  Object.keys(ICONS) as IconName[]
).map((v) => ({ value: v, label: v.replace(/-/g, " ") }));

export function iconFor(name: string): LucideIcon {
  return (ICONS as Record<string, LucideIcon>)[name] ?? Sparkles;
}

// --- Content shapes --------------------------------------------------------
export type CardItem = { icon: IconName; title: string; body: string };
export type HeroContent = { eyebrow: string; title: string; subtitle: string };
export type ListSection = { eyebrow: string; heading: string; items: CardItem[] };
export type OperatorCta = {
  eyebrow: string;
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type HomepageContent = {
  hero: HeroContent;
  features: ListSection;
  how: ListSection;
  operator: OperatorCta;
};

/** Editable section keys stored in site_content. */
export const HOMEPAGE_KEYS = ["hero", "features", "how", "operator"] as const;
export type HomepageKey = (typeof HOMEPAGE_KEYS)[number];

export const DEFAULT_HOMEPAGE: HomepageContent = {
  hero: {
    eyebrow: "Nigeria's intercity bus marketplace",
    title: "Intercity booking has never been easier.",
    subtitle:
      "Search easily, book conveniently, pay securely — all from your phone. No hassle, no stress; just walk in to the terminal to board and be on your way.",
  },
  features: {
    eyebrow: "Why Countribus",
    heading: "A premium way to move between cities.",
    items: [
      {
        icon: "map-pin",
        title: "Nationwide coverage",
        body: "Search direct departures from verified terminals in all 36 states and the FCT.",
      },
      {
        icon: "ticket",
        title: "Pick your exact seat",
        body: "A live, concurrency-safe seat map — your chosen seat is held while you pay, never double-sold.",
      },
      {
        icon: "shield-check",
        title: "Pay securely with Paystack",
        body: "Checkout with cards, bank transfer or USSD. Your payment is verified before your seat is confirmed — no surprises.",
      },
      {
        icon: "luggage",
        title: "Luggage, handled",
        body: "Declare bags up front with per-passenger allowances and clear fees — tagged and tracked.",
      },
      {
        icon: "qr-code",
        title: "Electronic tickets",
        body: "A scannable QR e-ticket per passenger, verified at the terminal on boarding.",
      },
      {
        icon: "badge-check",
        title: "Vetted operators",
        body: "Every operator is reviewed and approved before a single seat goes on sale.",
      },
    ],
  },
  how: {
    eyebrow: "Three steps",
    heading: "Booked before your coffee's cold.",
    items: [
      {
        icon: "search",
        title: "Search",
        body: "Enter your cities and date to see every direct departure, with live fares and seats.",
      },
      {
        icon: "ticket",
        title: "Select & hold",
        body: "Choose your exact seats on a live map — they're held for 10 minutes while you check out.",
      },
      {
        icon: "credit-card",
        title: "Pay & board",
        body: "Pay securely and receive your QR e-ticket by email, SMS and WhatsApp. Scan to board.",
      },
    ],
  },
  operator: {
    eyebrow: "For operators",
    heading: "Put your fleet in front of the whole country.",
    body: "Manage vehicles, seat layouts, routes and departures; sell with live inventory, instant settlement reporting and manifests built for the terminal.",
    primaryLabel: "List your fleet",
    primaryHref: "/dashboard/vendors/new",
    secondaryLabel: "Explore the portal",
    secondaryHref: "/dashboard",
  },
};
