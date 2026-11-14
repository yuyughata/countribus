"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** Auto-rotating crossfade photo slideshow for the hero background. */
export function HeroCarousel({ images }: { images: { url: string; caption: string | null }[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((img, idx) => (
        <div
          key={idx}
          role="img"
          aria-label={img.caption ?? "Countribus travel"}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out"
          style={{ backgroundImage: `url("${img.url}")`, opacity: idx === i ? 1 : 0 }}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Show slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn(
                "h-2 rounded-full transition-all",
                idx === i ? "bg-accent w-6" : "w-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
