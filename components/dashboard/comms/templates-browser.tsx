"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplatePreview } from "@/lib/notifications/catalog";

const CHANNEL_LABEL: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

export function TemplatesBrowser({ templates }: { templates: TemplatePreview[] }) {
  const [activeKey, setActiveKey] = useState(templates[0]?.key ?? "");
  const active = templates.find((t) => t.key === activeKey) ?? templates[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* List */}
      <div className="divide-border border-border h-max divide-y overflow-hidden rounded-xl border">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveKey(t.key)}
            className={cn(
              "block w-full px-4 py-3 text-left transition-colors",
              t.key === activeKey ? "bg-primary-soft" : "hover:bg-surface-muted",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground text-sm font-medium">{t.name}</span>
              <Badge tone={t.category === "Operator" ? "info" : "neutral"}>{t.category}</Badge>
            </div>
            <p className="text-subtle mt-0.5 line-clamp-1 text-xs">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Preview */}
      {active && (
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-foreground text-lg font-semibold">{active.name}</h3>
              {active.channels.map((c) => (
                <Badge key={c} tone="primary">
                  {CHANNEL_LABEL[c]}
                </Badge>
              ))}
            </div>
            <p className="text-muted mt-1 text-sm">
              {active.description} · <span className="text-subtle">Trigger: {active.trigger}</span>
            </p>
          </div>

          {active.email && (
            <div className="border-border overflow-hidden rounded-xl border">
              <div className="border-border bg-surface-muted border-b px-4 py-2.5 text-sm">
                <span className="text-subtle">Subject: </span>
                <span className="text-foreground font-medium">{active.email.subject}</span>
              </div>
              <iframe
                title="Email preview"
                srcDoc={active.email.html}
                sandbox=""
                className="h-[520px] w-full bg-white"
              />
            </div>
          )}

          {active.sms && (
            <div className="border-border rounded-xl border p-4">
              <p className="text-subtle mb-2 text-xs font-semibold tracking-wide uppercase">
                SMS / WhatsApp
              </p>
              <p className="bg-surface-muted text-foreground rounded-lg px-3 py-2 text-sm">
                {active.sms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
