"use client";

import { useEffect, useState } from "react";

import { Menu, X } from "lucide-react";

import { SidebarBrand, SidebarNav } from "@/components/dashboard/sidebar";

/** Hamburger + slide-in sidebar drawer for the dashboard on phones/tablets (< lg). */
export function MobileNav({ allowed }: { allowed?: string[] }) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="border-border bg-surface text-foreground hover:bg-surface-muted flex size-9 items-center justify-center rounded-lg border lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="bg-sidebar border-border absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground flex size-9 items-center justify-center rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav allowed={allowed} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
