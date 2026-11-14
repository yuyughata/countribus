"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Field, SaveRow } from "@/components/dashboard/content/ui";
import { saveHomepageSection } from "@/features/content/actions";
import { ICON_OPTIONS, iconFor, type IconName, type ListSection } from "@/lib/content/homepage";
import type { HomepageKey } from "@/lib/content/homepage";

export function ListSectionEditor({
  sectionKey,
  initial,
}: {
  sectionKey: HomepageKey;
  initial: ListSection;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<ListSection>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setItem = (i: number, patch: Partial<ListSection["items"][number]>) =>
    setV({ ...v, items: v.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= v.items.length) return;
    const items = [...v.items];
    [items[i], items[j]] = [items[j], items[i]];
    setV({ ...v, items });
  };
  const remove = (i: number) => setV({ ...v, items: v.items.filter((_, j) => j !== i) });
  const add = () =>
    setV({ ...v, items: [...v.items, { icon: "sparkles" as IconName, title: "", body: "" }] });

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveHomepageSection(sectionKey, v);
      if (r.ok) {
        setMsg({ ok: true, text: "Saved." });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Eyebrow" value={v.eyebrow} onChange={(x) => setV({ ...v, eyebrow: x })} />
        <Field label="Heading" value={v.heading} onChange={(x) => setV({ ...v, heading: x })} />
      </div>

      <div className="space-y-3">
        {v.items.map((it, i) => {
          const Icon = iconFor(it.icon);
          return (
            <div key={i} className="border-border rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <span className="bg-accent-soft text-accent-strong flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <div className="grid flex-1 gap-2 sm:grid-cols-[150px_1fr]">
                  <label className="text-muted block space-y-1 text-xs font-medium">
                    Icon
                    <select
                      value={it.icon}
                      onChange={(e) => setItem(i, { icon: e.target.value as IconName })}
                      className={fieldClass}
                    >
                      {ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Title" value={it.title} onChange={(x) => setItem(i, { title: x })} />
                  <div className="sm:col-span-2">
                    <Field
                      label="Body"
                      value={it.body}
                      onChange={(x) => setItem(i, { body: x })}
                      textarea
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn
                    label="Move down"
                    disabled={i === v.items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label="Remove" danger onClick={() => remove(i)}>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="size-4" /> Add item
        </Button>
        <SaveRow pending={pending} msg={msg} onSave={save} />
      </div>
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
        "text-subtle flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-30",
        danger ? "hover:text-danger hover:bg-danger-soft" : "hover:text-foreground hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}
