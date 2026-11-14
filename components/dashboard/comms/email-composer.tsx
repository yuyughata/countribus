"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Image as ImageIcon, Send, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";
import { RichText } from "@/components/dashboard/comms/rich-text";
import {
  countRecipients,
  deleteCampaign,
  saveCampaign,
  sendCampaign,
  sendTestCampaign,
  type CampaignInput,
} from "@/features/email-campaigns/actions";
import type { Campaign } from "@/features/email-campaigns/queries";
import { AUDIENCES } from "@/lib/notifications/audiences";
import { buildCampaignHtml } from "@/lib/notifications/campaign-html";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "newsletter", label: "Newsletter", hint: "Product news and updates" },
  { value: "promotion", label: "Promotion", hint: "An offer or promo code" },
  { value: "announcement", label: "Announcement", hint: "Something important" },
  { value: "service_update", label: "Service update", hint: "Schedules, routes, operations" },
];

export function EmailComposer({ campaign }: { campaign: Campaign | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [id, setId] = useState<string | null>(campaign?.id ?? null);
  const [type, setType] = useState(campaign?.type ?? "newsletter");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [previewText, setPreviewText] = useState(campaign?.preview_text ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(campaign?.header_image_url ?? "");
  const [bodyHtml, setBodyHtml] = useState(campaign?.body_html ?? "");
  const [buttonText, setButtonText] = useState(campaign?.button_text ?? "");
  const [buttonUrl, setButtonUrl] = useState(campaign?.button_url ?? "");
  const [footerImageUrl, setFooterImageUrl] = useState(campaign?.footer_image_url ?? "");
  const [audiences, setAudiences] = useState<string[]>(campaign?.audiences ?? ["customers"]);
  const [extra, setExtra] = useState<string[]>(campaign?.extra_recipients ?? []);
  const [extraInput, setExtraInput] = useState("");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [count, setCount] = useState<number | null>(null);

  const input = (): CampaignInput => ({
    id: id ?? undefined,
    type,
    subject,
    previewText,
    headerImageUrl,
    bodyHtml,
    buttonText,
    buttonUrl,
    footerImageUrl,
    audiences,
    extraRecipients: extra,
  });

  // Live recipient count.
  useEffect(() => {
    let cancelled = false;
    start(async () => {
      const n = await countRecipients(audiences, extra);
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [audiences, extra]);

  const previewHtml = useMemo(
    () =>
      buildCampaignHtml({
        previewText,
        headerImageUrl,
        bodyHtml,
        button: { text: buttonText, url: buttonUrl },
        footerImageUrl,
      }),
    [previewText, headerImageUrl, bodyHtml, buttonText, buttonUrl, footerImageUrl],
  );

  function toggleAudience(key: string) {
    setAudiences((a) => (a.includes(key) ? a.filter((x) => x !== key) : [...a, key]));
  }
  function addExtra() {
    const v = extraInput.trim().toLowerCase();
    if (v.includes("@") && !extra.includes(v)) setExtra([...extra, v]);
    setExtraInput("");
  }

  function run(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string; message?: string; id?: string }>,
  ) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? label) : (r.error ?? "Something went wrong") });
      if (r.ok && "id" in r && r.id) setId(r.id);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,440px)]">
      {/* ---------------------------------------------------------- Composer */}
      <div className="space-y-5">
        {/* Type */}
        <section className="border-border bg-surface rounded-xl border p-4">
          <p className={labelClass}>Type of email</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  type === t.value
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-subtle mt-2 text-xs">{TYPES.find((t) => t.value === type)?.hint}</p>

          <label className={cn(labelClass, "mt-4 block")}>
            Subject
            <input
              className={fieldClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="A clear, compelling subject"
            />
          </label>
          <label className={cn(labelClass, "mt-3 block")}>
            Preview text{" "}
            <span className="text-subtle font-normal">(shown after the subject in the inbox)</span>
            <input
              className={fieldClass}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="A short teaser line"
            />
          </label>
        </section>

        <ImageField
          label="Header image"
          hint="Top of the email. 1200 × 400 px works well."
          url={headerImageUrl}
          onChange={setHeaderImageUrl}
        />

        {/* Message */}
        <section className="space-y-2">
          <p className={labelClass}>Message</p>
          <RichText key={id ?? "new"} initialHtml={bodyHtml} onChange={setBodyHtml} />
        </section>

        {/* Button */}
        <section className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <label className={labelClass}>
            Button text
            <input
              className={fieldClass}
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Book a trip"
            />
          </label>
          <label className={labelClass}>
            Button link
            <input
              className={fieldClass}
              value={buttonUrl}
              onChange={(e) => setButtonUrl(e.target.value)}
              placeholder="https://countribus.app/search"
            />
          </label>
          <p className="text-subtle text-xs sm:col-span-2">
            Shown below the message. Leave both empty for no button.
          </p>
        </section>

        <ImageField
          label="Footer image"
          hint="Bottom of the email, after the button. Any height; 1200 px wide."
          url={footerImageUrl}
          onChange={setFooterImageUrl}
        />

        {/* Send to */}
        <section className="border-border bg-surface rounded-xl border p-4">
          <p className={labelClass}>Send to</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {AUDIENCES.map((a) => (
              <label
                key={a.key}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm",
                  audiences.includes(a.key) ? "border-primary bg-primary-soft/40" : "border-border",
                )}
              >
                <input
                  type="checkbox"
                  checked={audiences.includes(a.key)}
                  onChange={() => toggleAudience(a.key)}
                  className="mt-0.5 size-4 accent-[var(--color-primary)]"
                />
                <span>
                  <span className="text-foreground block font-medium">{a.label}</span>
                  <span className="text-subtle text-xs">{a.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <p className={cn(labelClass, "mt-4")}>Also send to particular people</p>
          <input
            className={fieldClass}
            placeholder="Type an email and press Enter"
            value={extraInput}
            onChange={(e) => setExtraInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExtra();
              }
            }}
          />
          {extra.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extra.map((e) => (
                <span
                  key={e}
                  className="bg-surface-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                >
                  {e}
                  <button
                    type="button"
                    onClick={() => setExtra(extra.filter((x) => x !== e))}
                    aria-label="Remove"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-foreground mt-3 text-sm font-semibold">
            {count == null ? "…" : count} {count === 1 ? "person" : "people"} will get it
          </p>
          <p className="text-subtle text-xs">Only active accounts with an email address.</p>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run("Draft saved.", () => saveCampaign(input()))}
          >
            Save draft
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run("Test sent.", () => sendTestCampaign(input()))}
          >
            Send test to me
          </Button>
          <Button
            disabled={pending}
            className="gap-2"
            onClick={() =>
              start(async () => {
                setMsg(null);
                const saved = await saveCampaign(input());
                if (!saved.ok) {
                  setMsg({ ok: false, text: saved.error });
                  return;
                }
                setId(saved.id);
                if (
                  !window.confirm(
                    `Send "${subject || "this email"}" to ${count ?? 0} recipient(s)?`,
                  )
                )
                  return;
                const r = await sendCampaign(saved.id);
                setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Sent.") : r.error });
                router.refresh();
              })
            }
          >
            <Send className="size-4" /> Send…
          </Button>
          {id && (
            <button
              type="button"
              className="text-danger ml-auto text-sm hover:underline"
              onClick={() => {
                if (window.confirm("Delete this draft?"))
                  run("Deleted.", async () => {
                    const r = await deleteCampaign(id);
                    if (r.ok) router.push("/dashboard/communications/emails");
                    return r;
                  });
              }}
            >
              <Trash2 className="mr-1 inline size-3.5" />
              Delete draft
            </button>
          )}
        </div>
        {msg && (
          <p className={msg.ok ? "text-success text-sm" : "text-danger text-sm"}>{msg.text}</p>
        )}
      </div>

      {/* ---------------------------------------------------------- Preview */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass}>Preview</p>
          <div className="bg-surface-muted inline-flex rounded-full p-0.5 text-xs">
            {(["desktop", "phone"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={cn(
                  "rounded-full px-3 py-1 capitalize",
                  device === d ? "bg-brand-ink text-white" : "text-muted",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-surface-muted flex justify-center rounded-xl p-3">
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            sandbox=""
            className={cn(
              "h-[640px] rounded-lg border-0 bg-white shadow-sm",
              device === "phone" ? "w-[360px]" : "w-full",
            )}
          />
        </div>
        <p className="text-subtle mt-2 text-xs">
          This is how it looks in most email apps. Send a test to see it in your inbox.
        </p>
      </div>
    </div>
  );
}

function ImageField({
  label,
  hint,
  url,
  onChange,
}: {
  label: string;
  hint: string;
  url: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="border-border bg-surface rounded-xl border p-4">
      <p className={labelClass}>{label}</p>
      <p className="text-subtle mb-2 text-xs">{hint}</p>
      <div className="flex gap-2">
        <input
          className={fieldClass}
          placeholder="Paste an image URL"
          value={url}
          onChange={(e) => onChange(e.target.value)}
        />
        {url && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        )}
      </div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="mt-3 max-h-40 w-full rounded-lg object-cover" />
      ) : (
        <div className="border-border text-subtle mt-3 flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed text-xs">
          <ImageIcon className="size-4" /> No image
        </div>
      )}
    </section>
  );
}
