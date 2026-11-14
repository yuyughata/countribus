import Link from "next/link";

import { Logo, PoweredBy } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { SiteNav } from "@/components/marketing/site-nav";
import { getAuthContext } from "@/lib/auth/context";

/**
 * Public marketing header. Server component: resolves the signed-in state once
 * and hands it to the interactive {@link SiteNav}. `tone="light"` sits over the
 * dark hero; `tone="ink"` is the solid header on interior pages.
 */
export async function SiteHeader({ tone = "ink" }: { tone?: "ink" | "light" }) {
  const ctx = await getAuthContext().catch(() => null);
  return <SiteNav tone={tone} signedIn={Boolean(ctx)} />;
}

export function SiteFooter() {
  return (
    <footer className="bg-ink-gradient mt-16 text-white sm:mt-20">
      {/* Mailing-list capture band */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Never miss an update
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Get latest on new routes, and amazing deals.
            </p>
          </div>
          <div className="w-full max-w-md">
            <NewsletterForm />
          </div>
        </div>
      </div>

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
                ["Create an account", "/register"],
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
