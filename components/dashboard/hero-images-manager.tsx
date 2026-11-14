"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  deleteHeroImage,
  moveHeroImage,
  toggleHeroImage,
  uploadHeroImage,
} from "@/features/hero/actions";
import type { HeroImage } from "@/features/hero/queries";

export function HeroImagesManager({ images }: { images: HeroImage[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Something went wrong");
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(() => uploadHeroImage(fd), () => formRef.current?.reset());
  }

  return (
    <div className="space-y-5">
      {err && <p className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-sm">{err}</p>}

      <form
        ref={formRef}
        onSubmit={onUpload}
        className="border-border bg-surface flex flex-wrap items-end gap-3 rounded-xl border p-4"
      >
        <label className="text-muted space-y-1 text-xs font-medium">
          Image file
          <input
            name="file"
            type="file"
            accept="image/*"
            required
            className="text-muted file:bg-primary-soft file:text-primary block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
          />
        </label>
        <label className="text-muted space-y-1 text-xs font-medium">
          Caption (optional)
          <input name="caption" className={cn(fieldClass, "w-56")} placeholder="e.g. Lagos terminal" />
        </label>
        <Button type="submit" disabled={pending} className="gap-2">
          <Upload className="size-4" /> {pending ? "Uploading…" : "Upload image"}
        </Button>
      </form>

      {images.length === 0 ? (
        <p className="text-muted text-sm">
          No images yet. Upload a few wide photos (landscape works best) — they&apos;ll rotate
          behind the homepage hero.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className={cn(
                "border-border bg-surface overflow-hidden rounded-xl border",
                !img.is_active && "opacity-60",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption ?? "Hero image"}
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-muted truncate text-xs">
                  {img.caption || `Slide ${i + 1}`}
                  {!img.is_active && " · hidden"}
                </span>
                <div className="flex items-center gap-1">
                  <IconBtn
                    label="Move up"
                    disabled={pending || i === 0}
                    onClick={() => run(() => moveHeroImage(img.id, "up"))}
                  >
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn
                    label="Move down"
                    disabled={pending || i === images.length - 1}
                    onClick={() => run(() => moveHeroImage(img.id, "down"))}
                  >
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn
                    label={img.is_active ? "Hide" : "Show"}
                    disabled={pending}
                    onClick={() => run(() => toggleHeroImage(img.id, !img.is_active))}
                  >
                    {img.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </IconBtn>
                  <IconBtn
                    label="Delete"
                    danger
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm("Delete this image?")) run(() => deleteHeroImage(img.id));
                    }}
                  >
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-subtle flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-30",
        danger ? "hover:text-danger hover:bg-danger-soft" : "hover:text-foreground hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}
