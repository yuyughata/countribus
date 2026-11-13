import type * as React from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-foreground mb-6 block text-center text-xl font-bold tracking-tight"
        >
          countri<span className="text-primary">bus</span>
        </Link>
        <div className="border-border bg-surface rounded-xl border p-6 shadow-[var(--shadow-card)]">
          {children}
        </div>
      </div>
    </main>
  );
}
