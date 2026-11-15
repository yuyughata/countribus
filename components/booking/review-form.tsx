"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass as field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { submitReview } from "@/features/reviews/actions";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    if (rating < 1) {
      setErr("Pick a rating");
      return;
    }
    start(async () => {
      const r = await submitReview(bookingId, rating, comment);
      if (r.ok) router.refresh();
      else setErr(r.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            <Star
              className={cn(
                "size-6",
                n <= (hover || rating) ? "fill-accent text-accent" : "text-border-strong",
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        className={cn(field, "min-h-[70px] py-2")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share how your trip went (optional)"
      />
      {err && <p className="text-danger text-xs">{err}</p>}
      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </div>
  );
}
