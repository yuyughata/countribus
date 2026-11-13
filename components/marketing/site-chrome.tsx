import Link from "next/link";

import { Logo, PoweredBy } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * Public marketing chrome. `tone="light"` sits over the dark hero (white text);
 * `tone="ink"` is the solid light header used on interior public pages.
 */
export function SiteHeader({ tone = "ink" }: { tone?: "ink" | "light" }) {
  const light = tone === "light";
  return (
    <header
      className={
        light
          ? "flex items-center justify-between"
          : "border-border bg-surface/80 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur sm:px-6"
      }
    >
      <Link href="/" aria-label="Countribus home">
        <Logo tone={light ? "light" : "ink"} />
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link href="/search">
          <Button variant="ghost" size="sm" className={light ? "text-white hover:bg-white/10" : ""}>
            Find a trip
          </Button>
        </Link>
        <Link href="/bookings">
          <Button variant="ghost" size="sm" className={light ? "text-white hover:bg-white/10" : ""}>
            My bookings
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant={light ? "accent" : "secondary"} size="sm">
            Operator portal
          </Button>
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink-gradient mt-20 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-sm text-white/60">
              Nigeria&apos;s intercity bus marketplace — verified operators, live seats, secure
              payments and electronic tickets.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <FooterCol
              title="Travel"
              links={[
                ["Find a trip", "/search"],
                ["My bookings", "/bookings"],
              ]}
            />
            <FooterCol
              title="Operators"
              links={[
                ["Operator portal", "/dashboard"],
                ["List your fleet", "/dashboard/vendors/new"],
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                ["Sign in", "/login"],
                ["Register", "/register"],
              ]}
            />
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
          <PoweredBy tone="light" />
          <p>© {new Date().getFullYear()} Countribus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-accent text-[11px] font-semibold tracking-widest uppercase">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-white/70 transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
