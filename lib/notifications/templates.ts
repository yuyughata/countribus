import { formatKobo } from "@/lib/money";

export interface BookingConfirmationData {
  contactName: string;
  reference: string;
  vendorName: string;
  originCity: string;
  destinationCity: string;
  departureAt: string; // ISO
  passengerCount: number;
  grandTotalKobo: number;
  ticketUrl: string;
}

function formatDeparture(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NG", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function bookingConfirmationEmail(d: BookingConfirmationData): {
  subject: string;
  html: string;
  text: string;
} {
  const when = formatDeparture(d.departureAt);
  const total = formatKobo(d.grandTotalKobo);
  const subject = `Booking confirmed — ${d.reference} (${d.originCity} → ${d.destinationCity})`;

  const text = [
    `Hi ${d.contactName},`,
    ``,
    `Your payment is confirmed and your trip with ${d.vendorName} is booked.`,
    ``,
    `Reference: ${d.reference}`,
    `Route: ${d.originCity} → ${d.destinationCity}`,
    `Departs: ${when}`,
    `Passengers: ${d.passengerCount}`,
    `Total paid: ${total}`,
    ``,
    `View and download your ticket(s): ${d.ticketUrl}`,
    ``,
    `Safe travels,`,
    `Countribus`,
  ].join("\n");

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#F2863C;margin:0 0 4px">Booking confirmed 🎉</h2>
  <p>Hi ${esc(d.contactName)}, your payment is confirmed and your trip with <strong>${esc(d.vendorName)}</strong> is booked.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Reference</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(d.reference)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Route</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(d.originCity)} → ${esc(d.destinationCity)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Departs</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(when)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Passengers</td><td style="padding:6px 0;text-align:right;font-weight:600">${d.passengerCount}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Total paid</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(total)}</td></tr>
  </table>
  <p><a href="${esc(d.ticketUrl)}" style="display:inline-block;background:#F2863C;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">View your ticket</a></p>
  <p style="color:#999;font-size:12px;margin-top:24px">Safe travels — Countribus</p>
  </body></html>`;

  return { subject, html, text };
}
