import type * as React from "react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      {/* soft brand glow backdrop */}
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,161,92,0.12),transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>
        <div className="border-border bg-surface rounded-2xl border p-7 shadow-[var(--shadow-lift)]">
          {children}
        </div>
        <p className="text-subtle mt-6 text-center text-xs">
          Verified operators · Secure payments · Electronic tickets
        </p>
      </div>
    </main>
  );
}
