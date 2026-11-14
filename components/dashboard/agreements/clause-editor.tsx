"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";
import {
  addClause,
  deleteClause,
  moveClause,
  toggleClauseHidden,
  updateClause,
} from "@/features/agreements/actions";
import type { AgreementKind, Clause } from "@/features/agreements/queries";
import { cn } from "@/lib/utils";

function paras(body: string) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ClauseEditor({ kind, clauses }: { kind: AgreementKind; clauses: Clause[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  const visible = clauses.filter((c) => !c.is_hidden);

  return (
    <div className="space-y-4">
      {err && <p className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-sm">{err}</p>}

      {clauses.map((c, i) => {
        const n = c.is_hidden ? null : visible.indexOf(c) + 1;
        return (
          <div
            key={c.id}
            className={cn(
              "border-border bg-surface rounded-xl border p-5",
              c.is_hidden && "opacity-70",
            )}
          >
            {editing === c.id ? (
              <ClauseForm
                initialTitle={c.title}
                initialBody={c.body}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(t, b) =>
                  run(
                    () => updateClause(c.id, t, b),
                    () => setEditing(null),
                  )
                }
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-subtle text-xs">
                      {c.is_hidden ? "Hidden clause" : `Clause ${n}`}
                    </p>
                    <h3 className="font-display text-foreground text-lg font-semibold">
                      {c.title}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {c.is_hidden && <Badge tone="neutral">Hidden</Badge>}
                    <IconBtn
                      label="Move up"
                      disabled={pending || i === 0}
                      onClick={() => run(() => moveClause(c.id, "up"))}
                    >
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                      disabled={pending || i === clauses.length - 1}
                      onClick={() => run(() => moveClause(c.id, "down"))}
                    >
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(c.id)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="text-muted mt-3 space-y-2 text-sm leading-relaxed">
                  {paras(c.body).length === 0 ? (
                    <p className="text-subtle italic">No text yet.</p>
                  ) : (
                    paras(c.body).map((p, j) => <p key={j}>{p}</p>)
                  )}
                </div>
                <div className="border-border mt-4 flex items-center gap-4 border-t pt-3 text-sm">
                  <button
                    type="button"
                    className="text-muted hover:text-foreground"
                    disabled={pending}
                    onClick={() => run(() => toggleClauseHidden(c.id, !c.is_hidden))}
                  >
                    {c.is_hidden ? "Show in the agreement" : "Hide from the agreement"}
                  </button>
                  <button
                    type="button"
                    className="text-danger hover:underline"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Delete clause "${c.title}"?`))
                        run(() => deleteClause(c.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="border-border bg-surface rounded-xl border p-5">
          <ClauseForm
            pending={pending}
            onCancel={() => setAdding(false)}
            onSave={(t, b) =>
              run(
                () => addClause(kind, t, b),
                () => setAdding(false),
              )
            }
          />
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Add a clause
        </Button>
      )}
    </div>
  );
}

function ClauseForm({
  initialTitle = "",
  initialBody = "",
  pending,
  onSave,
  onCancel,
}: {
  initialTitle?: string;
  initialBody?: string;
  pending: boolean;
  onSave: (title: string, body: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  return (
    <div className="space-y-3">
      <label className={labelClass}>
        Clause title
        <input
          className={fieldClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Service standards"
        />
      </label>
      <label className={labelClass}>
        Clause text{" "}
        <span className="text-subtle font-normal">(separate paragraphs with a blank line)</span>
        <textarea
          className={cn(fieldClass, "min-h-[140px] py-2")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the clause…"
        />
      </label>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => onSave(title, body)}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="border-border text-muted hover:text-foreground hover:bg-surface-muted flex size-8 items-center justify-center rounded-full border disabled:opacity-30"
    >
      {children}
    </button>
  );
}
