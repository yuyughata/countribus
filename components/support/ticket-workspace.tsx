"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AlertTriangle, MessageSquarePlus, Send, ShieldAlert, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldClass as field, labelClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_CATEGORIES,
  OPERATOR_CATEGORIES,
  TICKET_STATUSES,
  createTicket,
  loadTicketThread,
  replyToTicket,
  setTicketStatus,
} from "@/features/support/actions";
import type { Ticket, TicketMessage, VendorHealth } from "@/features/support/queries";

const CATEGORY_LABEL: Record<string, string> = {
  feedback: "Feedback",
  complaint: "Complaint",
  assistance: "Booking help",
  technical: "Technical",
  platform: "Platform",
  billing: "Billing",
  other: "Other",
};

const STATUS_TONE: Record<string, "warning" | "info" | "success" | "neutral"> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

type Mode = "customer" | "operator" | "admin";

export function TicketWorkspace({
  mode,
  tickets,
  bookings = [],
  creatorNames = {},
  flagged = [],
}: {
  mode: Mode;
  tickets: Ticket[];
  bookings?: { id: string; reference: string }[];
  creatorNames?: Record<string, string>;
  flagged?: VendorHealth[];
}) {
  return (
    <div className="space-y-5">
      {mode === "admin" && <FlaggedOperators rows={flagged} />}

      {mode !== "admin" && <NewTicket mode={mode} bookings={bookings} />}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "admin" ? "All tickets" : "Your requests"}</CardTitle>
          <Badge tone="neutral">{tickets.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <p className="text-muted p-6 text-sm">No tickets yet.</p>
          ) : (
            <div className="divide-border divide-y">
              {tickets.map((t) => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  isAdmin={mode === "admin"}
                  creatorName={creatorNames[t.created_by ?? ""] ?? null}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FlaggedOperators({ rows }: { rows: VendorHealth[] }) {
  const flagged = rows.filter((r) => r.flagged);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="text-danger size-4" /> Flagged operators
        </CardTitle>
        <Badge tone={flagged.length ? "danger" : "neutral"}>{flagged.length}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {flagged.length === 0 ? (
          <p className="text-muted p-5 text-sm">
            No operators flagged. An operator is flagged by a low rating (≥3 reviews averaging under
            3★) or 3+ complaints.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {flagged.map((v) => (
              <div key={v.vendor_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-semibold">{v.vendor_name}</p>
                  <p className="text-subtle text-xs">
                    {v.review_count > 0
                      ? `${v.avg_rating}★ · ${v.review_count} reviews`
                      : "No reviews"}
                    {" · "}
                    {v.complaint_count} complaint{v.complaint_count === 1 ? "" : "s"}
                    {v.open_complaints > 0 ? ` (${v.open_complaints} open)` : ""}
                  </p>
                </div>
                <Badge tone="danger" className="gap-1">
                  <AlertTriangle className="size-3" /> Review
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewTicket({
  mode,
  bookings,
}: {
  mode: "customer" | "operator";
  bookings: { id: string; reference: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const cats = mode === "operator" ? OPERATOR_CATEGORIES : CUSTOMER_CATEGORIES;
  const [form, setForm] = useState({
    category: cats[0] as string,
    subject: "",
    body: "",
    bookingId: "",
  });

  function submit() {
    setNote(null);
    start(async () => {
      const r = await createTicket({
        authorKind: mode,
        category: form.category,
        subject: form.subject,
        body: form.body,
        bookingId: form.bookingId || null,
      });
      if (r.ok) {
        setForm({ category: cats[0], subject: "", body: "", bookingId: "" });
        setOpen(false);
        router.refresh();
      } else setNote(r.error);
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>
          {mode === "operator" ? "Request platform assistance" : "Contact support"}
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant={open ? "ghost" : "primary"}
          onClick={() => setOpen((v) => !v)}
        >
          <MessageSquarePlus className="size-4" /> {open ? "Cancel" : "New request"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Type
              <select
                className={field}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c] ?? c}
                  </option>
                ))}
              </select>
            </label>
            {mode === "customer" && bookings.length > 0 && (
              <label className={labelClass}>
                About a booking (optional)
                <select
                  className={field}
                  value={form.bookingId}
                  onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                >
                  <option value="">Not about a booking</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reference}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className={labelClass}>
            Subject
            <input
              className={field}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Short summary"
            />
          </label>
          <label className={labelClass}>
            Message
            <textarea
              className={cn(field, "min-h-[110px] py-2")}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Tell us what's going on…"
            />
          </label>
          {note && (
            <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{note}</p>
          )}
          <Button type="button" size="sm" disabled={pending} onClick={submit}>
            {pending ? "Sending…" : "Send request"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function TicketRow({
  ticket,
  isAdmin,
  creatorName,
}: {
  ticket: Ticket;
  isAdmin: boolean;
  creatorName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TicketMessage[] | null>(null);
  const [loading, start] = useTransition();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sending, startSend] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && messages === null) {
      start(async () => {
        const r = await loadTicketThread(ticket.id);
        if (r.ok) setMessages(r.messages);
      });
    }
  }

  function send() {
    setNote(null);
    startSend(async () => {
      const r = await replyToTicket(ticket.id, reply);
      if (!r.ok) {
        setNote(r.error);
        return;
      }
      setReply("");
      const t = await loadTicketThread(ticket.id);
      if (t.ok) setMessages(t.messages);
      router.refresh();
    });
  }

  function changeStatus(status: string) {
    startSend(async () => {
      await setTicketStatus(ticket.id, status);
      router.refresh();
    });
  }

  return (
    <div className={cn(open && "bg-surface-muted/30")}>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-semibold">{ticket.subject}</p>
          <p className="text-subtle truncate text-xs">
            {CATEGORY_LABEL[ticket.category] ?? ticket.category}
            {isAdmin && creatorName ? ` · ${creatorName}` : ""} ·{" "}
            {new Date(ticket.updated_at).toLocaleString("en-NG")}
          </p>
        </div>
        <Badge tone={STATUS_TONE[ticket.status] ?? "neutral"}>
          {STATUS_LABEL[ticket.status] ?? ticket.status}
        </Badge>
      </button>

      {open && (
        <div className="space-y-3 px-5 pb-4">
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-subtle text-xs">Set status:</span>
              {TICKET_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending || s === ticket.status}
                  onClick={() => changeStatus(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    s === ticket.status
                      ? "border-primary text-primary"
                      : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}

          {loading && messages === null ? (
            <p className="text-subtle text-sm">Loading…</p>
          ) : (
            <div className="space-y-2">
              {(messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    m.is_admin
                      ? "bg-primary-soft text-foreground ml-auto"
                      : "bg-surface border-border border",
                  )}
                >
                  <p className="text-subtle mb-0.5 text-[11px] font-medium">
                    {m.is_admin ? "Countribus Support" : isAdmin ? "Requester" : "You"} ·{" "}
                    {new Date(m.created_at).toLocaleString("en-NG")}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
          )}

          {ticket.status !== "closed" && (
            <div className="flex items-end gap-2">
              <textarea
                className={cn(field, "min-h-[44px] py-2")}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
              />
              <Button type="button" size="sm" disabled={sending || !reply.trim()} onClick={send}>
                <Send className="size-4" />
              </Button>
            </div>
          )}
          {note && <p className="text-danger text-xs">{note}</p>}
        </div>
      )}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("size-4", n <= value ? "fill-accent text-accent" : "text-border-strong")}
        />
      ))}
    </span>
  );
}
