"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Mail, MessageCircle, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldClass, labelClass } from "@/components/ui/field";
import {
  saveEmailSettings,
  saveSmsSettings,
  saveWhatsAppSettings,
  sendTestEmail,
  type Result,
} from "@/features/communications/actions";
import type { CommStatus } from "@/features/communications/queries";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--color-primary)]"
      />
      <span className="text-muted">{on ? "Enabled" : "Disabled"}</span>
    </label>
  );
}

function Secret({
  label,
  isSet,
  value,
  onChange,
}: {
  label: string;
  isSet: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={labelClass}>
      {label} {isSet && <Badge tone="success">set</Badge>}
      <input
        type="password"
        className={fieldClass}
        autoComplete="off"
        placeholder={isSet ? "•••••••• (leave blank to keep)" : "Paste key"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function IntegrationsForm({ status }: { status: CommStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  function run(key: string, fn: () => Promise<Result>) {
    start(async () => {
      const r = await fn();
      setMsg((m) => ({
        ...m,
        [key]: { ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : r.error },
      }));
      if (r.ok) router.refresh();
    });
  }

  // local editable state
  const [email, setEmail] = useState({
    enabled: status.email.enabled,
    apiKey: "",
    from: status.email.from,
    fromName: status.email.fromName,
  });
  const [sms, setSms] = useState({
    enabled: status.sms.enabled,
    sid: "",
    token: "",
    from: status.sms.from,
  });
  const [wa, setWa] = useState({
    enabled: status.whatsapp.enabled,
    token: "",
    phoneId: status.whatsapp.phoneId,
  });

  const note = (key: string) =>
    msg[key] && (
      <span className={msg[key].ok ? "text-success text-sm" : "text-danger text-sm"}>
        {msg[key].text}
      </span>
    );

  return (
    <div className="grid gap-5">
      {/* Email — Resend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="text-primary size-4" /> Email — Resend
            <Badge tone={status.email.enabled ? "success" : "neutral"}>
              {status.email.enabled ? "On" : "Off"}
            </Badge>
          </CardTitle>
          <Toggle on={email.enabled} onChange={(v) => setEmail({ ...email, enabled: v })} />
        </CardHeader>
        <CardContent className="space-y-3">
          <Secret
            label="Resend API key"
            isSet={status.email.apiKeySet}
            value={email.apiKey}
            onChange={(v) => setEmail({ ...email, apiKey: v })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              From address
              <input
                className={fieldClass}
                placeholder="no-reply@countribus.ng"
                value={email.from}
                onChange={(e) => setEmail({ ...email, from: e.target.value })}
              />
            </label>
            <label className={labelClass}>
              From name
              <input
                className={fieldClass}
                placeholder="Countribus"
                value={email.fromName}
                onChange={(e) => setEmail({ ...email, fromName: e.target.value })}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run("email", () =>
                  saveEmailSettings({
                    enabled: email.enabled,
                    apiKey: email.apiKey || undefined,
                    from: email.from,
                    fromName: email.fromName,
                  }),
                )
              }
            >
              Save email settings
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("email", () => sendTestEmail())}
            >
              Send test to me
            </Button>
            {note("email")}
          </div>
        </CardContent>
      </Card>

      {/* SMS — Twilio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="text-primary size-4" /> SMS — Twilio
            <Badge tone={status.sms.enabled ? "success" : "neutral"}>
              {status.sms.enabled ? "On" : "Off"}
            </Badge>
          </CardTitle>
          <Toggle on={sms.enabled} onChange={(v) => setSms({ ...sms, enabled: v })} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Secret
              label="Account SID"
              isSet={status.sms.sidSet}
              value={sms.sid}
              onChange={(v) => setSms({ ...sms, sid: v })}
            />
            <Secret
              label="Auth token"
              isSet={status.sms.tokenSet}
              value={sms.token}
              onChange={(v) => setSms({ ...sms, token: v })}
            />
          </div>
          <label className={labelClass}>
            Sender ID / From number
            <input
              className={fieldClass}
              placeholder="Countribus or +234…"
              value={sms.from}
              onChange={(e) => setSms({ ...sms, from: e.target.value })}
            />
          </label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run("sms", () =>
                  saveSmsSettings({
                    enabled: sms.enabled,
                    sid: sms.sid || undefined,
                    token: sms.token || undefined,
                    from: sms.from,
                  }),
                )
              }
            >
              Save SMS settings
            </Button>
            {note("sms")}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="text-primary size-4" /> WhatsApp — Meta Cloud API
            <Badge tone={status.whatsapp.enabled ? "success" : "neutral"}>
              {status.whatsapp.enabled ? "On" : "Off"}
            </Badge>
          </CardTitle>
          <Toggle on={wa.enabled} onChange={(v) => setWa({ ...wa, enabled: v })} />
        </CardHeader>
        <CardContent className="space-y-3">
          <Secret
            label="Access token"
            isSet={status.whatsapp.tokenSet}
            value={wa.token}
            onChange={(v) => setWa({ ...wa, token: v })}
          />
          <label className={labelClass}>
            Phone number ID
            <input
              className={fieldClass}
              placeholder="1234567890"
              value={wa.phoneId}
              onChange={(e) => setWa({ ...wa, phoneId: e.target.value })}
            />
          </label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run("wa", () =>
                  saveWhatsAppSettings({
                    enabled: wa.enabled,
                    token: wa.token || undefined,
                    phoneId: wa.phoneId,
                  }),
                )
              }
            >
              Save WhatsApp settings
            </Button>
            {note("wa")}
          </div>
        </CardContent>
      </Card>

      <p className="text-subtle text-xs">
        Secrets are stored securely and never shown again. Leave a key field blank to keep the
        existing value. Each channel only sends when it is enabled and fully configured.
      </p>
    </div>
  );
}
