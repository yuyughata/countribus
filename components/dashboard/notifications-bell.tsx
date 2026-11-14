"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { markInAppRead } from "@/features/notifications/actions";
import type { InAppNotification } from "@/features/notifications/queries";

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.round((Date.now() - d) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export function NotificationsBell({
  items,
  unread,
}: {
  items: InAppNotification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      start(async () => {
        await markInAppRead();
        router.refresh();
      });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="border-border bg-surface text-muted hover:text-foreground relative flex size-9 items-center justify-center rounded-full border"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="bg-danger absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="border-border bg-surface absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg"
        >
          <div className="border-border text-foreground border-b px-4 py-2.5 text-sm font-semibold">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="text-muted px-4 py-6 text-center text-sm">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const inner = (
                  <div className="flex gap-2">
                    {!n.readAt && (
                      <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                    )}
                    <div className={n.readAt ? "pl-4" : ""}>
                      <p className="text-foreground text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-muted mt-0.5 text-xs leading-snug">{n.body}</p>}
                      <p className="text-subtle mt-1 text-[11px]">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-border/60 border-b last:border-0">
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="hover:bg-surface-muted block px-4 py-3"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
