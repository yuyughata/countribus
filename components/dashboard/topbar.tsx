import { Bell, LogOut, Search } from "lucide-react";

import { MobileNav } from "@/components/dashboard/mobile-nav";
import { logoutAction } from "@/features/auth/actions";

export function Topbar({ title, email }: { title: string; email?: string | null }) {
  return (
    <header className="border-border bg-canvas flex h-16 items-center gap-3 border-b px-4 sm:gap-4 sm:px-5">
      <MobileNav />
      <h1 className="text-foreground text-base font-semibold">{title}</h1>
      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <Search className="text-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Search anything in this dashboard…"
          aria-label="Search dashboard"
          className="border-border bg-surface text-foreground placeholder:text-subtle focus-visible:border-primary h-9 w-full rounded-full border pr-4 pl-9 text-sm focus-visible:outline-none"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="border-border bg-surface text-muted hover:text-foreground relative flex size-9 items-center justify-center rounded-full border"
        >
          <Bell className="size-4" />
          <span className="bg-danger absolute top-2 right-2.5 size-1.5 rounded-full" />
        </button>
        {email && <span className="text-muted hidden text-sm sm:inline">{email}</span>}
        <div
          aria-hidden
          className="from-primary to-brand-slate size-9 rounded-full bg-gradient-to-br"
        />
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="border-border bg-surface text-muted hover:text-foreground flex size-9 items-center justify-center rounded-full border"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
