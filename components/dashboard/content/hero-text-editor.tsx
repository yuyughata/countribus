"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, SaveRow } from "@/components/dashboard/content/ui";
import { saveHomepageSection } from "@/features/content/actions";
import type { HeroContent } from "@/lib/content/homepage";

export function HeroTextEditor({ initial }: { initial: HeroContent }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveHomepageSection("hero", v);
      if (r.ok) {
        setMsg({ ok: true, text: "Saved." });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Eyebrow" value={v.eyebrow} onChange={(x) => setV({ ...v, eyebrow: x })} />
      <Field label="Title" value={v.title} onChange={(x) => setV({ ...v, title: x })} />
      <Field
        label="Subtitle"
        value={v.subtitle}
        onChange={(x) => setV({ ...v, subtitle: x })}
        textarea
      />
      <SaveRow pending={pending} msg={msg} onSave={save} />
    </div>
  );
}
