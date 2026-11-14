"use client";

import { useState } from "react";
import Link from "next/link";

import { LogOut, Menu, UserCircle, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Public header nav. Auth-aware: signed-out visitors get "Sign in" (the login
 * page links on to registration); signed-in users get "My bookings", "Manage account" and
 * a sign-out button. `tone="light"` sits over the dark hero (white text);
 * `tone="ink"` is the solid light header on interior pages. Collapses to a
 * hamburger menu on phones. `signedIn` is resolved on the server by SiteHeader.
 */
export function SiteNav({ tone = "ink", signedIn }: { tone?: "ink" | "light"; signedIn: boolean }) {
  const light = tone === "light";
  const [open, setOpen] = useState(false);

  // Shared text links (left of the account actions). "My bookings" always
  // shows — when signed out, /bookings redirects to the sign-in page.
  const links: [string, string][] = [
    ["Find a trip", "/search"],
    ["My bookings", "/bookings"],
  ];

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
        {links.map(([label, href]) => (
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

        {signedIn ? (
          <>
            <Link href="/account">
              <Button
                variant="ghost"
                size="sm"
                className={cn("gap-1.5", light && "text-white hover:bg-white/10")}
              >
                <UserCircle className="size-4" /> Manage account
              </Button>
            </Link>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant={light ? "accent" : "secondary"}
                size="sm"
                className="gap-1.5"
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant={light ? "accent" : "primary"} size="sm">
                Sign in
              </Button>
            </Link>
          </>
        )}
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
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-foreground hover:bg-surface-muted block rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                {label}
              </Link>
            ))}

            {signedIn ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="text-foreground hover:bg-surface-muted flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
                >
                  <UserCircle className="size-4" /> Manage account
                </Link>
                <form action={logoutAction} className="pt-1">
                  <Button type="submit" variant="secondary" className="w-full gap-1.5">
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </form>
              </>
            ) : (
              <div className="pt-1">
                <Link href="/login" onClick={() => setOpen(false)} className="block">
                  <Button variant="primary" className="w-full">
                    Sign in
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
