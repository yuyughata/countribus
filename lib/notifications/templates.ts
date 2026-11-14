import { formatKobo } from "@/lib/money";
import { emailShell, esc } from "@/lib/notifications/email-layout";

export type EmailMessage = { subject: string; html: string; text: string };

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

// ===========================================================================
// Booking confirmation (customer) — email + SMS/WhatsApp
// ===========================================================================
export function bookingConfirmationSms(
  d: BookingConfirmationData & { boardingAddress: string; contactPhone: string },
): string {
  const when = formatDeparture(d.departureAt);
  return [
    `Countribus: Booking ${d.reference} confirmed.`,
    `${d.originCity} to ${d.destinationCity}, ${when}.`,
    `Board at: ${d.boardingAddress}.`,
    `Contact: ${d.contactPhone}.`,
    `Ticket: ${d.ticketUrl}`,
  ].join(" ");
}

export type PolicyClause = { title: string; body: string };

function boardingPolicyHtml(clauses: PolicyClause[]): string {
  if (!clauses.length) return "";
  const items = clauses
    .map(
      (c, i) =>
        `<p style="margin:10px 0 2px;font-weight:600;font-size:13px;color:#2a0a15">${i + 1}. ${esc(c.title)}</p>` +
        c.body
          .split(/\n{2,}/)
          .filter((p) => p.trim())
          .map(
            (p) =>
              `<p style="margin:2px 0;font-size:12.5px;line-height:1.5;color:#5a4a50">${esc(p.trim())}</p>`,
          )
          .join(""),
    )
    .join("");
  return `<div style="margin-top:22px;border-top:1px solid #efe6e9;padding-top:14px">
    <p style="font-size:14px;font-weight:700;color:#8c2743;margin:0 0 4px">Boarding policy</p>
    <p style="font-size:12.5px;color:#7a6a70;margin:0 0 6px">Please read before you travel.</p>
    ${items}
  </div>`;
}

function boardingPolicyText(clauses: PolicyClause[]): string {
  if (!clauses.length) return "";
  return (
    "\n\n--- BOARDING POLICY ---\n" +
    clauses.map((c, i) => `${i + 1}. ${c.title}\n${c.body.replace(/\n{2,}/g, "\n")}`).join("\n\n")
  );
}

export function bookingConfirmationEmail(
  d: BookingConfirmationData,
  boardingPolicy: PolicyClause[] = [],
): EmailMessage {
  const when = formatDeparture(d.departureAt);
  const total = formatKobo(d.grandTotalKobo);
  return {
    subject: `Booking confirmed — ${d.reference} (${d.originCity} → ${d.destinationCity})`,
    text:
      [
        `Hi ${d.contactName},`,
        ``,
        `Your payment is confirmed and your trip with ${d.vendorName} is booked.`,
        ``,
        `Reference: ${d.reference}`,
        `Route: ${d.originCity} -> ${d.destinationCity}`,
        `Departs: ${when}`,
        `Passengers: ${d.passengerCount}`,
        `Total paid: ${total}`,
        ``,
        `View and download your ticket(s): ${d.ticketUrl}`,
        ``,
        `Safe travels, Countribus`,
      ].join("\n") + boardingPolicyText(boardingPolicy),
    html: emailShell({
      previewText: `Your trip with ${d.vendorName} is booked`,
      heading: "Booking confirmed 🎉",
      intro: `Hi ${d.contactName}, your payment is confirmed and your trip with ${d.vendorName} is booked.`,
      rows: [
        ["Reference", d.reference],
        ["Route", `${d.originCity} → ${d.destinationCity}`],
        ["Departs", when],
        ["Passengers", String(d.passengerCount)],
        ["Total paid", total],
      ],
      button: { label: "View your ticket", url: d.ticketUrl },
      appendHtml: boardingPolicyHtml(boardingPolicy),
      footerNote: "Please arrive at the terminal at least 30 minutes before departure.",
    }),
  };
}

// ===========================================================================
// Departure reminder (customer)
// ===========================================================================
export function departureReminderEmail(
  d: BookingConfirmationData & { boardingAddress: string },
): EmailMessage {
  const when = formatDeparture(d.departureAt);
  return {
    subject: `Reminder: your trip to ${d.destinationCity} departs soon`,
    text: `Hi ${d.contactName}, this is a reminder that your Countribus trip ${d.reference} (${d.originCity} -> ${d.destinationCity}) departs ${when}. Board at: ${d.boardingAddress}. Ticket: ${d.ticketUrl}`,
    html: emailShell({
      previewText: `Your trip departs ${when}`,
      heading: "Your trip is coming up",
      intro: `Hi ${d.contactName}, a friendly reminder about your upcoming journey.`,
      rows: [
        ["Reference", d.reference],
        ["Route", `${d.originCity} → ${d.destinationCity}`],
        ["Departs", when],
        ["Board at", d.boardingAddress],
      ],
      button: { label: "View your ticket", url: d.ticketUrl },
      footerNote: "Arrive at least 30 minutes early. Safe travels!",
    }),
  };
}

export function departureReminderSms(
  d: Pick<
    BookingConfirmationData,
    "reference" | "originCity" | "destinationCity" | "departureAt"
  > & {
    boardingAddress: string;
  },
): string {
  return `Countribus reminder: trip ${d.reference} (${d.originCity} to ${d.destinationCity}) departs ${formatDeparture(d.departureAt)}. Board at: ${d.boardingAddress}.`;
}

// ===========================================================================
// Booking cancelled / refunded (customer)
// ===========================================================================
export function bookingCancelledEmail(d: {
  contactName: string;
  reference: string;
  originCity: string;
  destinationCity: string;
  refundKobo?: number;
}): EmailMessage {
  const refunded = d.refundKobo && d.refundKobo > 0;
  return {
    subject: `Booking ${d.reference} cancelled`,
    text: `Hi ${d.contactName}, your booking ${d.reference} (${d.originCity} -> ${d.destinationCity}) has been cancelled.${refunded ? ` A refund of ${formatKobo(d.refundKobo!)} is on its way.` : ""}`,
    html: emailShell({
      heading: "Booking cancelled",
      intro: `Hi ${d.contactName}, your booking ${d.reference} (${d.originCity} → ${d.destinationCity}) has been cancelled.`,
      rows: refunded ? [["Refund", formatKobo(d.refundKobo!)]] : undefined,
      footerNote: refunded
        ? "Refunds are processed to your original payment method and may take a few business days."
        : "If this wasn't expected, please contact Countribus support.",
    }),
  };
}

export function bookingCancelledSms(d: { reference: string; refundKobo?: number }): string {
  return `Countribus: Booking ${d.reference} cancelled.${d.refundKobo && d.refundKobo > 0 ? ` Refund ${formatKobo(d.refundKobo)} on the way.` : ""}`;
}

// ===========================================================================
// New booking alert (vendor)
// ===========================================================================
export function vendorNewBookingEmail(d: {
  vendorName: string;
  reference: string;
  originCity: string;
  destinationCity: string;
  departureAt: string;
  passengerCount: number;
  netKobo: number;
  dashboardUrl: string;
}): EmailMessage {
  return {
    subject: `New booking ${d.reference} — ${d.originCity} → ${d.destinationCity}`,
    text: `${d.vendorName}: new paid booking ${d.reference}, ${d.passengerCount} passenger(s), ${d.originCity} -> ${d.destinationCity}, departs ${formatDeparture(d.departureAt)}. Your net: ${formatKobo(d.netKobo)}.`,
    html: emailShell({
      heading: "You've got a new booking 🚍",
      intro: `A passenger just paid for a seat on your service.`,
      rows: [
        ["Reference", d.reference],
        ["Route", `${d.originCity} → ${d.destinationCity}`],
        ["Departs", formatDeparture(d.departureAt)],
        ["Passengers", String(d.passengerCount)],
        ["Your net", formatKobo(d.netKobo)],
      ],
      button: { label: "Open dashboard", url: d.dashboardUrl },
    }),
  };
}

// ===========================================================================
// Vendor application decision
// ===========================================================================
export function vendorApprovedEmail(d: { vendorName: string; dashboardUrl: string }): EmailMessage {
  return {
    subject: `${d.vendorName} is approved on Countribus 🎉`,
    text: `Congratulations — ${d.vendorName} has been approved on Countribus. Add your fleet, routes and schedules, then set your payout account to start earning. ${d.dashboardUrl}`,
    html: emailShell({
      heading: "You're approved 🎉",
      intro: `Congratulations — ${d.vendorName} has been approved to sell on Countribus.`,
      bodyHtml: `<p style="font-size:15px;line-height:1.55;color:#3d2a30">Next steps: add your vehicles and seat layouts, publish routes and schedules, and set up your payout account so we can settle your earnings automatically.</p>`,
      button: { label: "Set up your operator", url: d.dashboardUrl },
    }),
  };
}

export function vendorRejectedEmail(d: { vendorName: string; reason?: string }): EmailMessage {
  return {
    subject: `Update on your Countribus application`,
    text: `Thank you for applying to Countribus with ${d.vendorName}. Unfortunately we can't approve the application at this time.${d.reason ? ` Reason: ${d.reason}.` : ""} You're welcome to reach out to support with any questions.`,
    html: emailShell({
      heading: "Application update",
      intro: `Thank you for applying to Countribus with ${d.vendorName}.`,
      bodyHtml: `<p style="font-size:15px;line-height:1.55;color:#3d2a30">Unfortunately we can't approve the application at this time.${d.reason ? ` <strong>Reason:</strong> ${d.reason}.` : ""} You're welcome to reach out to support with any questions or to reapply.</p>`,
    }),
  };
}

// ===========================================================================
// Partner Agreement updated — operator must review & re-sign
// ===========================================================================
export function partnerAgreementUpdatedEmail(d: {
  vendorName: string;
  version: number;
  agreementUrl: string;
}): EmailMessage {
  return {
    subject: `Action needed: Countribus Partner Agreement updated (v${d.version})`,
    text:
      `${d.vendorName}: the Countribus Partner Agreement has been updated to version ${d.version}. ` +
      `Please review the new terms and add your signature from your dashboard to keep your operator active. ${d.agreementUrl}`,
    html: emailShell({
      previewText: `The Partner Agreement has changed — please review and sign (v${d.version}).`,
      heading: "Partner Agreement updated 📝",
      intro: `Hello ${d.vendorName}, the Countribus Partner Agreement has been updated to version ${d.version}.`,
      bodyHtml: `<p style="font-size:15px;line-height:1.55;color:#3d2a30">Please review the revised terms and add your signature from your dashboard. Your previous signature applied to an earlier version, so a fresh signature is required to keep your operator active.</p>`,
      button: { label: "Review & sign", url: d.agreementUrl },
      footerNote:
        "If you've already signed version " + d.version + ", you can ignore this message.",
    }),
  };
}

export function partnerAgreementUpdatedSms(d: { version: number; agreementUrl: string }): string {
  return `Countribus: our Partner Agreement has been updated (v${d.version}). Please review and sign in your dashboard to stay active: ${d.agreementUrl}`;
}

// ===========================================================================
// Payout sent (vendor)
// ===========================================================================
export function payoutSentEmail(d: {
  vendorName: string;
  amountKobo: number;
  bookingCount: number;
  bankName: string;
  last4: string;
  dashboardUrl: string;
}): EmailMessage {
  return {
    subject: `Payout sent — ${formatKobo(d.amountKobo)}`,
    text: `${d.vendorName}: a payout of ${formatKobo(d.amountKobo)} for ${d.bookingCount} booking(s) has been sent to ${d.bankName} ••••${d.last4}.`,
    html: emailShell({
      heading: "Payout on the way 💸",
      intro: `We've settled your latest earnings to your bank account.`,
      rows: [
        ["Amount", formatKobo(d.amountKobo)],
        ["Bookings settled", String(d.bookingCount)],
        ["To", `${d.bankName} ••••${d.last4}`],
      ],
      button: { label: "View payouts", url: d.dashboardUrl },
      footerNote: "Bank transfers typically arrive within minutes but can take up to 24 hours.",
    }),
  };
}

// ===========================================================================
// Welcome (customer) & referral reward
// ===========================================================================
export function welcomeEmail(d: { name: string; searchUrl: string }): EmailMessage {
  return {
    subject: `Welcome to Countribus, ${d.name}!`,
    text: `Welcome ${d.name}! Book intercity trips across Nigeria from verified operators — search, pick your seat, pay securely, and get an e-ticket. ${d.searchUrl}`,
    html: emailShell({
      heading: `Welcome aboard, ${d.name}! 👋`,
      intro:
        "Book intercity trips across Nigeria from verified operators — search, pick your seat, pay securely, and travel with a digital ticket.",
      button: { label: "Find a trip", url: d.searchUrl },
    }),
  };
}

export function referralRewardEmail(d: {
  name: string;
  percent: number;
  searchUrl: string;
}): EmailMessage {
  return {
    subject: `You've earned ${d.percent}% off your next trip 🎁`,
    text: `Nice one, ${d.name}! A friend you referred just completed their first trip, so you've earned ${d.percent}% off your next booking. It will apply automatically at checkout. ${d.searchUrl}`,
    html: emailShell({
      heading: `You earned a reward 🎁`,
      intro: `Nice one, ${d.name}! A friend you referred just completed their first trip.`,
      bodyHtml: `<p style="font-size:15px;line-height:1.55;color:#3d2a30">You've earned <strong>${d.percent}% off</strong> your next booking — it applies automatically at checkout.</p>`,
      button: { label: "Book your next trip", url: d.searchUrl },
    }),
  };
}
