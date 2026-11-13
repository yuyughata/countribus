"use client";

import { useState } from "react";
import Link from "next/link";

import { Menu, X } from "lucide-react";

import { Logo, PoweredBy } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV: [string, string][] = [
  ["Find a trip", "/search"],
  ["My bookings", "/bookings"],
];

/**
 * Public marketing chrome. `tone="light"` sits over the dark hero (white text);
 * `tone="ink"` is the solid light header used on interior public pages. Collapses
 * to a hamburger menu on phones.
 */
export function SiteHeader({ tone = "ink" }: { tone?: "ink" | "light" }) {
  const light = tone === "light";
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "relative z-40",
        light
          ? "flex items-center justify-between py-1"
          : "border-border bg-surface/85 sticky top-0 flex items-center justify-between border-b px-4 py-3 backdrop-blur sm:px-6",
      )}
    >
      <Link href="/" aria-label="Countribus home" onClick={() => setOpen(false)}>
        <Logo tone={light ? "light" : "ink"} />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 sm:flex sm:gap-2">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href}>
            <Button
              variant="ghost"
              size="sm"
              className={light ? "text-white hover:bg-white/10" : ""}
            >
              {label}
            </Button>
          </Link>
        ))}
        <Link href="/dashboard">
          <Button variant={light ? "accent" : "secondary"} size="sm">
            Operator portal
          </Button>
        </Link>
      </nav>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex size-10 items-center justify-center rounded-lg sm:hidden",
          light ? "text-white hover:bg-white/10" : "text-foreground hover:bg-surface-muted",
        )}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute top-full right-0 left-0 mt-2 px-4 sm:hidden">
          <div className="border-border bg-surface space-y-1 rounded-xl border p-2 shadow-[var(--shadow-pop)]">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-foreground hover:bg-surface-muted block rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                {label}
              </Link>
            ))}
            <Link href="/dashboard" onClick={() => setOpen(false)} className="block pt-1">
              <Button variant="secondary" className="w-full">
                Operator portal
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink-gradient mt-16 text-white sm:mt-20">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-sm text-white/60">
              Nigeria&apos;s intercity bus marketplace — verified operators, live seats, secure
              payments and electronic tickets.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3 sm:gap-10">
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
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
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
