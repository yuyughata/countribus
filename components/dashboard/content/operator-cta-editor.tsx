"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, SaveRow } from "@/components/dashboard/content/ui";
import { saveHomepageSection } from "@/features/content/actions";
import type { OperatorCta } from "@/lib/content/homepage";

export function OperatorCtaEditor({ initial }: { initial: OperatorCta }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<OperatorCta>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveHomepageSection("operator", v);
      if (r.ok) {
        setMsg({ ok: true, text: "Saved." });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Eyebrow" value={v.eyebrow} onChange={(x) => setV({ ...v, eyebrow: x })} />
      <Field label="Heading" value={v.heading} onChange={(x) => setV({ ...v, heading: x })} />
      <Field label="Body" value={v.body} onChange={(x) => setV({ ...v, body: x })} textarea />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Primary button label"
          value={v.primaryLabel}
          onChange={(x) => setV({ ...v, primaryLabel: x })}
        />
        <Field
          label="Primary button link"
          value={v.primaryHref}
          onChange={(x) => setV({ ...v, primaryHref: x })}
        />
        <Field
          label="Secondary button label"
          value={v.secondaryLabel}
          onChange={(x) => setV({ ...v, secondaryLabel: x })}
        />
        <Field
          label="Secondary button link"
          value={v.secondaryHref}
          onChange={(x) => setV({ ...v, secondaryHref: x })}
        />
      </div>
      <SaveRow pending={pending} msg={msg} onSave={save} />
    </div>
  );
}
