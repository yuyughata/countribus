"use client";

import { useActionState } from "react";

import { CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { subscribeNewsletter } from "@/features/newsletter/actions";

/**
 * "Never miss an update" mailing-list capture. Lives on the dark footer band,
 * so it is styled for a dark surface. Idempotent server action; shows a
 * success state in place of the form once subscribed.
 */
export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, null);

  if (state?.ok) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white">
        <CheckCircle2 className="text-accent size-5 shrink-0" />
        <p>You&apos;re on the list — we&apos;ll keep you posted on new routes and deals.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/50" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-label="Email address"
            placeholder="you@example.com"
            className="h-11 w-full rounded-full border border-white/20 bg-white/10 pr-4 pl-10 text-sm text-white placeholder:text-white/50 focus-visible:border-white/50 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
          />
        </div>
        <Button type="submit" variant="accent" className="h-11 shrink-0" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-accent text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
