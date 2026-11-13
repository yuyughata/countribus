"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { updateProfile } from "@/features/profile/actions";

const field =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ full_name: fullName, phone });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await updateProfile(form);
      if (r.ok) {
        setMsg({ ok: true, text: "Profile updated." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <label className="text-muted block space-y-1 text-xs font-medium">
        Full name
        <input
          className={field}
          required
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
      </label>
      <label className="text-muted block space-y-1 text-xs font-medium">
        Phone
        <input
          className={field}
          value={form.phone}
          placeholder="+234 801 234 5678"
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
